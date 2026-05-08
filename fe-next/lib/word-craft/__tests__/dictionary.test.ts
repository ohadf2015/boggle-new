import { describe, it, expect } from 'vitest'
import { isValidWord } from '../dictionary'

describe('isValidWord', () => {
  it('returns true for word in dict (any case)', () => {
    const dict = new Set(['HELLO', 'WORLD'])
    expect(isValidWord('hello', dict)).toBe(true)
    expect(isValidWord('HELLO', dict)).toBe(true)
    expect(isValidWord('Hello', dict)).toBe(true)
  })

  it('returns false for missing word', () => {
    const dict = new Set(['HELLO'])
    expect(isValidWord('xyz', dict)).toBe(false)
  })

  it('returns false for null dict', () => {
    expect(isValidWord('hello', null)).toBe(false)
  })

  it('returns false for empty string', () => {
    const dict = new Set(['HELLO'])
    expect(isValidWord('', dict)).toBe(false)
  })
})
