import type { StyleSpecification } from 'maplibre-gl'
import { describe, expect, it } from 'vitest'
import { ENGLISH_NAME, englishStyle } from './mapStyle'

// The shape of OpenFreeMap's styles: labels pair a transliteration with the local script.
const LOCAL = ['case', ['has', 'name:nonlatin'], ['concat', ['get', 'name:latin'], '\n', ['get', 'name:nonlatin']], ['get', 'name']]
const style = {
  version: 8,
  sources: {},
  layers: [
    { id: 'background', type: 'background', paint: { 'background-color': 'rgb(242,243,240)' } },
    { id: 'water', type: 'fill', source: 'x', 'source-layer': 'water', paint: { 'fill-color': 'rgb(194,200,202)' } },
    { id: 'label_country_1', type: 'symbol', source: 'x', 'source-layer': 'place', layout: { 'text-field': LOCAL } },
    { id: 'road_shield', type: 'symbol', source: 'x', 'source-layer': 'road', layout: { 'text-field': ['to-string', ['get', 'ref']] } },
  ],
} as unknown as StyleSpecification

describe('englishStyle', () => {
  const out = englishStyle(style, 'light')
  const layer = (id: string) => out.layers.find((l) => l.id === id) as { layout?: Record<string, unknown>; paint?: Record<string, unknown> }

  it('labels places by their English name first', () => {
    expect(layer('label_country_1').layout?.['text-field']).toEqual(ENGLISH_NAME)
  })

  it('leaves road numbers alone', () => {
    expect(layer('road_shield').layout?.['text-field']).toEqual(['to-string', ['get', 'ref']])
  })

  it("paints land and water in the page's colours, per theme", () => {
    expect(layer('background').paint?.['background-color']).toBe('#efebe2')
    expect(englishStyle(style, 'dark').layers.find((l) => l.id === 'water')).toMatchObject({ paint: { 'fill-color': '#11161b' } })
  })

  it('does not change the style it was given', () => {
    expect((style.layers[2] as { layout: Record<string, unknown> }).layout['text-field']).toBe(LOCAL)
  })
})
