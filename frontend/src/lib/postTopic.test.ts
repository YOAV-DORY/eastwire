import { describe, expect, it } from 'vitest'
import { postTopic } from './postTopic'

describe('postTopic', () => {
  it('reads conflict words, hashtags included, before any other topic', () => {
    expect(postTopic('Missile strikes reported near the border')).toBe('conflict')
    expect(postTopic('Families of those who died fighting for Moscow. #RussiaUkrainewar')).toBe('conflict')
  })

  it('tells economy, climate and politics apart', () => {
    expect(postTopic('Inflation eased in September as food prices fell')).toBe('economy')
    expect(postTopic('Monsoon floods cut off three districts')).toBe('climate')
    expect(postTopic('The Supreme Court issued notice to the government')).toBe('politics')
  })

  it('gives no accent when no word matches', () => {
    expect(postTopic('An excerpt from a new novel')).toBeNull()
    expect(postTopic(null)).toBeNull()
  })
})
