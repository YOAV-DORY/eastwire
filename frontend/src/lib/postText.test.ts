import { describe, expect, it } from 'vitest'
import { cleanPostText, initials } from './postText'

describe('cleanPostText', () => {
  it('drops raw links and "Read more" lines', () => {
    expect(cleanPostText('Thousands protest in Delhi.\n\nRead more: scroll.in/latest/10964…')).toBe('Thousands protest in Delhi.')
    expect(cleanPostText('A pact is signed buff.ly/2WRGNfY')).toBe('A pact is signed')
    expect(cleanPostText('Is the Modi wave fading?\n\nyoutu.be/JUSdICy_2l8\n\nA ground report.')).toBe(
      'Is the Modi wave fading?\nA ground report.',
    )
  })

  it('keeps ordinary text', () => {
    expect(cleanPostText('Rupee steadies at 83.2 as the RBI steps in.')).toBe('Rupee steadies at 83.2 as the RBI steps in.')
  })

  it('makes two-letter badges', () => {
    expect(initials('The Diplomat')).toBe('TD')
    expect(initials('Scroll')).toBe('Sc')
  })
})
