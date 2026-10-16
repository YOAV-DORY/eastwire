import { maplibreGL } from '@maplibre/maplibre-gl-leaflet'
import type L from 'leaflet'
import { setWorkerUrl, type Map as GlMap, type StyleSpecification } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'

/*
 * MapLibre in its own chunk: the map's pins and controls draw at once, and this (the large
 * part) follows. The worker is served from our own origin (CSP worker-src 'self').
 */
setWorkerUrl(workerUrl)

/** A Leaflet layer drawing the style; its MapLibre map exists once the layer is on a map. */
export function createVectorLayer(style: StyleSpecification): L.Layer & { getMaplibreMap(): GlMap } {
  return maplibreGL({ style, attributionControl: false, interactive: false } as never) as unknown as L.Layer & {
    getMaplibreMap(): GlMap
  }
}
