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
 * Tiles: OpenStreetMap's standard tiles, toned down with a CSS filter so our own English city
 * labels lead (OSM labels places in local scripts). CARTO's tiles need an API key and a terms
 * review first (config/sources.yaml, carto-dark).
 */
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
      <TileLayer
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        className="ew-tiles"
        maxZoom={19}
      />
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
      marker.bindTooltip(pin.name, { permanent: true, direction: 'right', offset: [w / 2 - 2, -h / 2], className: 'ew-label' })
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
