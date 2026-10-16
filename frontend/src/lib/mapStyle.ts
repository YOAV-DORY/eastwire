import type { StyleSpecification } from 'maplibre-gl'

export type MapTheme = 'light' | 'dark'

/** English first, then a Latin transliteration, then the local name. */
export const ENGLISH_NAME = ['coalesce', ['get', 'name:en'], ['get', 'name_en'], ['get', 'name:latin'], ['get', 'name']]

/** EastWire's paper and ink, so the map sits in the page rather than on it. */
const PALETTE: Record<MapTheme, { background: string; water: string }> = {
  light: { background: '#efebe2', water: '#c3d2d6' },
  dark: { background: '#1b1d21', water: '#11161b' },
}

/**
 * Rewrites a style so its labels are English. Only labels built from a place's name change;
 * road numbers and the like stay as they are. Pure, so it can be tested without a map.
 */
export function englishStyle(style: StyleSpecification, theme: MapTheme): StyleSpecification {
  return {
    ...style,
    layers: style.layers.map((layer) => {
      if (layer.type === 'symbol' && layer.layout?.['text-field'] && JSON.stringify(layer.layout['text-field']).includes('name')) {
        return { ...layer, layout: { ...layer.layout, 'text-field': ENGLISH_NAME as never } }
      }
      if (layer.type === 'background') {
        return { ...layer, paint: { ...layer.paint, 'background-color': PALETTE[theme].background } }
      }
      if (layer.type === 'fill' && layer.id === 'water') {
        return { ...layer, paint: { ...layer.paint, 'fill-color': PALETTE[theme].water } }
      }
      return layer
    }),
  }
}
