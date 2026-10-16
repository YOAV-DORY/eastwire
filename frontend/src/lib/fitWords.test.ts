import { describe, expect, it } from 'vitest'
import { fitWords } from './fitWords'

// One unit per character keeps the arithmetic visible.
const measure = (s: string) => s.length

describe('fitWords', () => {
  it('keeps text that fits', () => {
    expect(fitWords('Seoul raises rates', 30, measure)).toBe('Seoul raises rates')
  })

  it('cuts between words, never inside one', () => {
    const fitted = fitWords('Bank of Japan holds rates steady again', 20, measure)
    expect(fitted).toBe('Bank of Japan holds…')
    expect(fitted.length).toBeLessThanOrEqual(20)
  })

  it('drops punctuation left before the ellipsis', () => {
    expect(fitWords('In Seoul, the central bank waits', 10, measure)).toBe('In Seoul…')
  })

  it('shows a first word whole when nothing shorter fits', () => {
    expect(fitWords('Semiconductors rally', 6, measure)).toBe('Semiconductors…')
  })
})
