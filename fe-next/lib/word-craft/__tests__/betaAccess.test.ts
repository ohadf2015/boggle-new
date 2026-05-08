import { describe, it, expect } from 'vitest'
import { isWordCraftBetaUser } from '../betaAccess'

describe('isWordCraftBetaUser', () => {
  it('returns true for whitelisted emails', () => {
    expect(isWordCraftBetaUser('ohadf2015@gmail.com')).toBe(true)
    expect(isWordCraftBetaUser('eden320@gmail.com')).toBe(true)
  })
  it('returns false for unknown email', () => {
    expect(isWordCraftBetaUser('other@example.com')).toBe(false)
  })
  it('returns false for undefined', () => {
    expect(isWordCraftBetaUser(undefined)).toBe(false)
  })
})
