// @vitest-environment node
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

/*
 * WCAG contrast checks on the real tokens.css (design plan 17.6).
 * Text needs 4.5:1 (AA). Graphics such as sector dots and pins need 3:1.
 */

const css = readFileSync(fileURLToPath(new URL('./tokens.css', import.meta.url)), 'utf8')

function block(selectorStart: string): Record<string, string> {
  const start = css.indexOf(selectorStart)
  if (start < 0) throw new Error(`No block starting with ${selectorStart}`)
  const body = css.slice(css.indexOf('{', start) + 1, css.indexOf('}', start))
  const vars: Record<string, string> = {}
  for (const m of body.matchAll(/(--[\w-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)) vars[m[1]] = m[2]
  return vars
}

const dark = block(':root,\n[data-theme="dark"]')
// Light overrides dark; anything it doesn't redefine (e.g. --accent) is inherited.
const light = { ...dark, ...block('[data-theme="light"]') }

function luminance(hex: string): number {
  const channels = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
  const [r, g, b] = channels.map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

describe.each([
  ['dark', dark],
  ['light', light],
])('%s theme', (_name, t) => {
  it.each([
    ['--text', '--bg'],
    ['--text', '--bg-elev-2'],
    ['--text-muted', '--bg'],
    ['--text-muted', '--bg-elev-1'],
    ['--text-muted', '--bg-elev-2'],
    ['--accent-text', '--bg'],
    ['--accent-text', '--bg-elev-1'],
    ['--text-on-accent', '--accent'],
    ['--text-on-accent', '--accent-hover'],
    ['--text-on-accent', '--accent-press'],
    ['--accent-text', '--bg-elev-2'],
    ['--on-ink-muted', '--ink'],
    ['--danger', '--bg'],
    ['--on-ink', '--ink'],
    ['--on-ink-muted', '--ink'],
    ['--health-ok', '--bg'],
    ['--health-warn', '--bg'],
    ['--health-bad', '--bg'],
    ['--text', '--select'],
  ])('text %s on %s meets AA (4.5:1)', (fg, bg) => {
    expect(contrast(t[fg], t[bg])).toBeGreaterThanOrEqual(4.5)
  })

  it('the brand red stands out as a fill (pins, chosen chips) on the page (3:1)', () => {
    expect(contrast(t['--accent'], t['--bg'])).toBeGreaterThanOrEqual(3)
  })
})

describe('the brand red', () => {
  it('is one colour family in both themes: the same fill, a lighter red only for text on dark', () => {
    expect(light['--accent']).toBe(dark['--accent'])
    expect(contrast(dark['--accent-text'], dark['--bg'])).toBeGreaterThan(contrast(dark['--accent'], dark['--bg']))
  })

  it('carries white text on its fill in both themes', () => {
    expect(dark['--text-on-accent']).toBe('#ffffff')
    expect(light['--text-on-accent'] ?? dark['--text-on-accent']).toBe('#ffffff')
  })
})
