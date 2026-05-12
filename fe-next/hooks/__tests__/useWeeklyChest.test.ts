import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useWeeklyChest } from '../useWeeklyChest'

const makeFetch = (body: object) =>
  vi.fn().mockResolvedValue({ ok: true, json: async () => body })

describe('useWeeklyChest', () => {
  beforeEach(() => vi.clearAllMocks())

  it('is loading initially', () => {
    global.fetch = makeFetch({ daysCompleted: 3, isClaimable: false, completedDates: [], cycleStart: '2026-05-10', cycleNumber: 1, pendingChest: null })
    const { result } = renderHook(() => useWeeklyChest())
    expect(result.current.loading).toBe(true)
  })

  it('resolves data after fetch', async () => {
    global.fetch = makeFetch({ daysCompleted: 7, isClaimable: true, completedDates: ['2026-05-06','2026-05-07','2026-05-08','2026-05-09','2026-05-10','2026-05-11','2026-05-12'], cycleStart: '2026-05-06', cycleNumber: 1, pendingChest: { tier: 'gold', coins: 600, badgeId: 'badge_weekly_gold' } })
    const { result } = renderHook(() => useWeeklyChest())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.daysCompleted).toBe(7)
    expect(result.current.isClaimable).toBe(true)
    expect(result.current.pendingChest?.tier).toBe('gold')
  })

  it('claim() POSTs and then refreshes', async () => {
    const claimResponse = { tier: 'silver', coins: 300, badgeId: 'badge_weekly_silver', cycleNumber: 1 }
    global.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ daysCompleted: 7, isClaimable: true, completedDates: [], cycleStart: '2026-05-06', cycleNumber: 1, pendingChest: null }) })
      .mockResolvedValueOnce({ ok: true, json: async () => claimResponse })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ daysCompleted: 0, isClaimable: false, completedDates: [], cycleStart: '2026-05-13', cycleNumber: 2, pendingChest: null }) })
    const { result } = renderHook(() => useWeeklyChest())
    await waitFor(() => expect(result.current.loading).toBe(false))
    const claimed = await result.current.claim()
    expect(claimed?.tier).toBe('silver')
    expect(global.fetch).toHaveBeenCalledTimes(3)
  })

  it('claim() returns null on failed POST', async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ daysCompleted: 3, isClaimable: false, completedDates: [], cycleStart: '2026-05-06', cycleNumber: 1, pendingChest: null }) })
      .mockResolvedValueOnce({ ok: false })
    const { result } = renderHook(() => useWeeklyChest())
    await waitFor(() => expect(result.current.loading).toBe(false))
    const claimed = await result.current.claim()
    expect(claimed).toBeNull()
  })
})
