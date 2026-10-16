import type L from 'leaflet'
import type { StyleSpecification } from 'maplibre-gl'
import { englishStyle, type MapTheme as Theme } from '../../lib/mapStyle'
import { useEffect, useState } from 'react'
import { TileLayer, useMap } from 'react-leaflet'

/*
 * The map's base layer.
 *
 * Vector tiles from OpenFreeMap (free, no key, no limits; terms read 2026-10-16, docs/map.md),
 * drawn by MapLibre inside Leaflet, so every place name can be shown in English: the styles'
 * own labels pair a transliteration with the local script ("Moskva / Москва"); here each label
 * reads the English name first. Light and dark each have their own style.
 *
 * MapLibre is loaded on demand (vectorLayer.ts), so pins appear first on the paper-coloured
 * map background and the base map fades in under them.
 *
 * Without WebGL, or if the style cannot load, the map falls back to OpenStreetMap's raster
 * tiles (local-script labels) with EastWire's own English country names on top.
 */

const STYLE = {
  light: 'https://tiles.openfreemap.org/styles/positron',
  dark: 'https://tiles.openfreemap.org/styles/dark',
} as const

/** The credit OpenFreeMap asks for; MapLibre's own control is off, so Leaflet's shows it. */
export const VECTOR_ATTRIBUTION =
  '<a href="https://openfreemap.org">OpenFreeMap</a> &copy; <a href="https://www.openmaptiles.org/">OpenMapTiles</a> Data from &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'

const RASTER_URL: string = import.meta.env.VITE_TILE_URL ?? 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
const RASTER_ATTRIBUTION: string =
  import.meta.env.VITE_TILE_ATTRIBUTION ?? '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'

function webglAvailable(): boolean {
  try {
    const canvas = document.createElement('canvas')
    return Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'))
  } catch {
    return false
  }
}

/** The page's theme, followed live (the toggle changes the attribute on <html>). */
function useDocumentTheme(): Theme {
  const read = (): Theme => (document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark')
  const [theme, setTheme] = useState<Theme>(read)
  useEffect(() => {
    const observer = new MutationObserver(() => setTheme(read()))
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => observer.disconnect()
  }, [])
  return theme
}

/**
 * The base layer. `onMode` reports which one is showing, so the map can add its own English
 * country names over the raster fallback (the vector map already names them).
 */
export function Basemap({ onMode }: { onMode: (mode: 'vector' | 'raster') => void }) {
  const map = useMap()
  const theme = useDocumentTheme()
  const [vector, setVector] = useState(() => typeof document !== 'undefined' && webglAvailable())

  useEffect(() => onMode(vector ? 'vector' : 'raster'), [vector, onMode])

  useEffect(() => {
    if (!vector) return
    let cancelled = false
    let layer: L.Layer | null = null
    let cleanup = () => {}
    Promise.all([
      fetch(STYLE[theme]).then((r) => {
        if (!r.ok) throw new Error(`style ${r.status}`)
        return r.json() as Promise<StyleSpecification>
      }),
      import('./vectorLayer'),
    ])
      .then(([style, { createVectorLayer }]) => {
        if (cancelled) return
        const gl = createVectorLayer(englishStyle(style, theme))
        layer = gl.addTo(map)
        map.attributionControl?.addAttribution(VECTOR_ATTRIBUTION)
        const glMap = gl.getMaplibreMap()
        // A failed tile is retried by MapLibre; a style that never loads, or lost WebGL, falls back.
        const giveUp = window.setTimeout(() => {
          if (!cancelled && !glMap.loaded()) setVector(false)
        }, 10000)
        glMap.once('load', () => window.clearTimeout(giveUp))
        glMap.on('webglcontextlost', () => {
          if (!cancelled) setVector(false)
        })
        cleanup = () => window.clearTimeout(giveUp)
      })
      .catch(() => {
        if (!cancelled) setVector(false)
      })
    return () => {
      cancelled = true
      cleanup()
      if (layer) map.removeLayer(layer)
      map.attributionControl?.removeAttribution(VECTOR_ATTRIBUTION)
    }
  }, [map, theme, vector])

  return vector ? null : <TileLayer url={RASTER_URL} attribution={RASTER_ATTRIBUTION} className="ew-tiles" maxZoom={19} />
}
