import { afterEach, describe, expect, it } from 'vitest'
import { isSavedCopy, PAGE_LOADED_AT, readSaved, SAVED_COPY_MAX_AGE_MS, writeSaved } from './savedCopy'

afterEach(() => localStorage.clear())

describe('saved copy', () => {
  it('keeps what the API returned with the time it was saved', () => {
    writeSaved(['front', {}], { lead: 'x' }, 1_000)
    expect(readSaved(['front', {}], 2_000)).toEqual({ data: { lead: 'x' }, savedAt: 1_000 })
  })

  it('forgets copies older than a week rather than show them', () => {
    writeSaved(['front', {}], { lead: 'x' }, 0)
    expect(readSaved(['front', {}], SAVED_COPY_MAX_AGE_MS + 1)).toBeUndefined()
  })

  it('keeps at most sixteen views, dropping the oldest', () => {
    for (let i = 0; i < 20; i++) writeSaved(['front', { country: String(i) }], i, 1_000 + i)
    expect(readSaved(['front', { country: '0' }], 2_000)).toBeUndefined()
    expect(readSaved(['front', { country: '19' }], 2_000)?.data).toBe(19)
  })

  it('tells a saved copy from this page load’s data', () => {
    expect(isSavedCopy(PAGE_LOADED_AT - 1)).toBe(true)
    expect(isSavedCopy(PAGE_LOADED_AT + 1)).toBe(false)
    expect(isSavedCopy(0)).toBe(false)
  })

  it('works without storage', () => {
    const original = Storage.prototype.getItem
    Storage.prototype.getItem = () => {
      throw new Error('blocked')
    }
    try {
      expect(readSaved(['front', {}])).toBeUndefined()
    } finally {
      Storage.prototype.getItem = original
    }
  })
})
