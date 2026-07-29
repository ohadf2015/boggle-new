import { describe, it, expect } from 'vitest'
import { freezeDateToBridge } from '../chestFreezeBridge'

describe('freezeDateToBridge', () => {
  const today = '2026-05-12'
  const yesterday = '2026-05-11'
  const dayBefore = '2026-05-10'

  it('bridges a single missed day flanked by completed days', () => {
    // …dayBefore (05-10), [missed 05-11], today (05-12) → freeze 05-11
    expect(freezeDateToBridge([dayBefore, today], today, 1)).toBe(yesterday)
  })

  it('returns null when no freeze is available', () => {
    expect(freezeDateToBridge([dayBefore, today], today, 0)).toBeNull()
  })

  it('returns null when yesterday was actually completed (no gap)', () => {
    expect(freezeDateToBridge([dayBefore, yesterday, today], today, 1)).toBeNull()
  })

  it('returns null for a two-day gap (one freeze cannot bridge two days)', () => {
    // dayBefore missing too: …09, [missed 10], [missed 11], today
    expect(freezeDateToBridge(['2026-05-09', today], today, 1)).toBeNull()
  })

  it('returns null when today itself is not completed', () => {
    expect(freezeDateToBridge([dayBefore], today, 1)).toBeNull()
  })

  it('accepts a Set as well as an array', () => {
    expect(freezeDateToBridge(new Set([dayBefore, today]), today, 2)).toBe(yesterday)
  })

  it('crosses month boundaries', () => {
    // today 06-01, dayBefore 05-30, missed 05-31
    expect(freezeDateToBridge(['2026-05-30', '2026-06-01'], '2026-06-01', 1)).toBe('2026-05-31')
  })
})
