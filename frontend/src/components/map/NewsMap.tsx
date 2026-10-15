import L from 'leaflet'
import 'leaflet.markercluster'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet/dist/leaflet.css'
import { useEffect, useRef } from 'react'
import { CircleMarker, MapContainer, TileLayer, useMap } from 'react-leaflet'
import type { CityPin, PlaceView } from '../../api/types'
import { PIN_PIXELS, pinLabel, pinSize, pinSvg, popupHtml, populationRadius } from '../../lib/map'
import './NewsMap.css'

/**
 * Interactive Leaflet map: pink city pins (clustered when zoomed out), optional population
 * circles. Loaded lazily (see LazyNewsMap) so Leaflet stays out of the main bundle.
 *
 * Tiles: OpenStreetMap's standard tiles (usage policy checked; attribution always shown), only
 * lightly desaturated so their own labels stay readable. OSM names places in local scripts, so
 * English country and city labels are drawn on top. A different provider can be set at build
 * time (VITE_TILE_URL, VITE_TILE_ATTRIBUTION), e.g. CARTO once the owner has its API key.
 */
const TILE_URL: string = import.meta.env.VITE_TILE_URL ?? 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
const TILE_ATTRIBUTION: string =
  import.meta.env.VITE_TILE_ATTRIBUTION ??
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'

/** English names for the covered countries, placed where city pins rarely are (Japan's and Korea's over the sea). */
const COUNTRY_LABELS: { name: string; at: [number, number] }[] = [
  { name: 'CHINA', at: [36.5, 96.5] },
  { name: 'INDIA', at: [19.8, 79.6] },
  { name: 'JAPAN', at: [39.5, 144.5] },
  { name: 'SOUTH KOREA', at: [33.2, 125.2] },
]
export interface NewsMapProps {
  pins: CityPin[]
  population?: PlaceView[]
  selectedId?: number
  onSelect?: (pin: CityPin) => void
  /** A city whose story the reader is pointing at in a list: its pin (or cluster) lights up. */
  highlightedId?: number | null
  /** Companion use on touch screens: no dragging, so the page can still scroll past the map. */
  staticOnTouch?: boolean
  reducedMotion?: boolean
}

/** The four covered countries, from southern India to northern Japan and China's west to Japan's east. */
const COVERED: L.LatLngBoundsExpression = [
  [7, 67],
  [46, 146],
]

export default function NewsMap({
  pins,
  population,
  selectedId,
  onSelect,
  highlightedId,
  staticOnTouch,
  reducedMotion,
}: NewsMapProps) {
  const touch = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches
  return (
    <MapContainer
      bounds={COVERED}
      boundsOptions={{ padding: [8, 8] }}
      minZoom={2}
      maxZoom={10}
      className="ew-map"
      scrollWheelZoom={false}
      dragging={!(staticOnTouch && touch)}
      zoomAnimation={!reducedMotion}
      fadeAnimation={!reducedMotion}
      markerZoomAnimation={!reducedMotion}
      worldCopyJump
    >
      <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} className="ew-tiles" maxZoom={19} />
      <CountryLabels pins={pins} />
      <FrameStories pins={pins} />
      <ShowSelected pins={pins} selectedId={selectedId} />
      {population?.map((p) => (
        <CircleMarker
          key={p.id}
          center={[p.lat, p.lon]}
          radius={populationRadius(p.population)}
          interactive={false}
          pathOptions={{ className: 'ew-population', weight: 1, fillOpacity: 0.06 }}
        />
      ))}
      <Pins pins={pins} selectedId={selectedId} onSelect={onSelect} highlightedId={highlightedId} reducedMotion={reducedMotion} />
    </MapContainer>
  )
}

/**
 * English country names over the tiles' local-script labels; not interactive, hidden from
 * screen readers. A label steps aside (hides) while a pin or cluster sits on it.
 */
function CountryLabels({ pins }: { pins: CityPin[] }) {
  const map = useMap()
  useEffect(() => {
    const markers = COUNTRY_LABELS.map(({ name, at }) =>
      L.marker(at, {
        icon: L.divIcon({ html: name, className: 'ew-country', iconSize: [120, 16], iconAnchor: [60, 8] }),
        interactive: false,
        keyboard: false,
        zIndexOffset: -1000,
      }),
    )
    const layer = L.layerGroup(markers)
    map.addLayer(layer)
    const declutter = () => {
      COUNTRY_LABELS.forEach(({ name, at }, i) => {
        const centre = map.latLngToContainerPoint(at)
        const halfWidth = name.length * 5 + 16
        const clash = pins.some((p) => {
          const point = map.latLngToContainerPoint([p.lat, p.lon])
          return Math.abs(point.x - centre.x) < halfWidth && point.y - centre.y < 24 && centre.y - point.y < 44
        })
        markers[i].getElement()?.style.setProperty('visibility', clash ? 'hidden' : 'visible')
      })
    }
    declutter()
    map.on('zoomend moveend', declutter)
    return () => {
      map.off('zoomend moveend', declutter)
      map.removeLayer(layer)
    }
  }, [map, pins])
  return null
}

/**
 * Frames the map on where the stories are (padded, never closer than zoom 6) instead of the
 * whole region, so a map of three Indian cities is not mostly empty sea. Re-frames only when
 * the set of pinned cities changes, not when one is selected or highlighted.
 */
function FrameStories({ pins }: { pins: CityPin[] }) {
  const map = useMap()
  const ids = pins.map((p) => p.id).sort((a, b) => a - b).join(',')
  useEffect(() => {
    if (pins.length === 0) {
      map.fitBounds(COVERED, { padding: [8, 8] })
      return
    }
    const bounds = L.latLngBounds(pins.map((p) => [p.lat, p.lon] as [number, number])).pad(pins.length === 1 ? 2 : 0.35)
    map.fitBounds(bounds, { padding: [24, 24], maxZoom: 6 })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only a change in the set of cities re-frames
  }, [map, ids])
  return null
}

/** A chosen city is shown on its own: zoom in far enough that its pin leaves any cluster. */
function ShowSelected({ pins, selectedId }: { pins: CityPin[]; selectedId?: number }) {
  const map = useMap()
  const pin = pins.find((p) => p.id === selectedId)
  useEffect(() => {
    if (!pin) return
    map.setView([pin.lat, pin.lon], Math.max(map.getZoom(), 6))
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only a new selection moves the map
  }, [map, pin?.id])
  return null
}

function Pins({
  pins,
  selectedId,
  onSelect,
  highlightedId,
  reducedMotion,
}: Pick<NewsMapProps, 'pins' | 'selectedId' | 'onSelect' | 'highlightedId' | 'reducedMotion'>) {
  const map = useMap()
  const markers = useRef(new Map<number, L.Marker>())
  const groupRef = useRef<L.MarkerClusterGroup | null>(null)
  useEffect(() => {
    markers.current.clear()
    const group = L.markerClusterGroup({
      showCoverageOnHover: false,
      maxClusterRadius: 44,
      animate: !reducedMotion,
      iconCreateFunction: (cluster) => {
        const stories = cluster
          .getAllChildMarkers()
          .reduce((sum, m) => sum + ((m.options as { stories?: number }).stories ?? 0), 0)
        const size = stories >= 100 ? 48 : stories >= 20 ? 40 : 34
        return L.divIcon({
          html: `<span>${stories}</span>`,
          className: 'ew-cluster',
          iconSize: [size, size],
        })
      },
    })
    pins.forEach((pin, index) => {
      const [w, h] = PIN_PIXELS[pinSize(pin.total)]
      const selected = pin.id === selectedId
      const marker = L.marker([pin.lat, pin.lon], {
        icon: L.divIcon({
          html: pinSvg(pin),
          className: `ew-pin${selected ? ' ew-pin--selected' : ''}${reducedMotion ? '' : ' ew-pin--drop'}`,
          iconSize: [w, h],
          iconAnchor: [w / 2, h],
          popupAnchor: [0, -h],
        }),
        keyboard: true,
        alt: pinLabel(pin),
        title: pinLabel(pin),
        riseOnHover: true,
        stories: pin.total,
      } as L.MarkerOptions & { stories: number })
      marker.bindPopup(popupHtml(pin), { closeButton: true, className: 'ew-popup-wrap' })
      // English names for the places that have stories; the tiles' own labels are in local scripts.
      marker.bindTooltip(pin.name, {
        permanent: true,
        direction: 'right',
        offset: [w / 2 - 2, -h / 2],
        className: selected ? 'ew-label ew-label--selected' : 'ew-label',
      })
      markers.current.set(pin.id, marker)
      marker.on('click', () => onSelect?.(pin))
      marker.on('add', () => marker.getElement()?.style.setProperty('--i', String(Math.min(index, 12))))
      group.addLayer(marker)
    })
    map.addLayer(group)
    groupRef.current = group

    // "Open city →" links inside popups navigate in-app instead of reloading the page.
    const container = map.getContainer()
    const onClick = (event: MouseEvent) => {
      const link = (event.target as Element | null)?.closest?.('a[data-city]')
      if (!link || !onSelect) return
      const pin = pins.find((p) => String(p.id) === link.getAttribute('data-city'))
      if (pin) {
        event.preventDefault()
        map.closePopup()
        onSelect(pin)
      }
    }
    container.addEventListener('click', onClick)
    return () => {
      container.removeEventListener('click', onClick)
      map.removeLayer(group)
    }
  }, [map, pins, selectedId, onSelect, reducedMotion])

  // Light the pin of the story being pointed at; if the pin sits in a cluster, light the cluster.
  useEffect(() => {
    if (highlightedId == null) return
    const marker = markers.current.get(highlightedId)
    const group = groupRef.current
    if (!marker || !group) return
    const shown = (group.getVisibleParent(marker) ?? marker) as L.Marker
    const element = shown.getElement()
    element?.classList.add('ew-hot')
    return () => element?.classList.remove('ew-hot')
  }, [highlightedId, pins])
  return null
}
