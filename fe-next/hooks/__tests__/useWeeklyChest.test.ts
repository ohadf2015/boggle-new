import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useWeeklyChest, _resetWeeklyChestCache } from '../useWeeklyChest'

const authState = { isAuthenticated: true, loading: false }
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => authState,
}))

const makeFetch = (body: object) =>
  vi.fn().mockResolvedValue({ ok: true, json: async () => body })

describe('useWeeklyChest', () => {
  // Reset the module-level dedup cache between tests — without this, a cached
  // status from one test leaks into the next (within the 4s TTL) and shifts the
  // mocked-fetch call sequence.
  beforeEach(() => {
    vi.clearAllMocks()
    _resetWeeklyChestCache()
    authState.isAuthenticated = true
    authState.loading = false
  })

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

  it('returns safe defaults when API responds with an error payload', async () => {
    global.fetch = makeFetch({ error: 'Unauthorized' })
    const { result } = renderHook(() => useWeeklyChest())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.daysCompleted).toBe(0)
    expect(result.current.completedDates).toEqual([])
    expect(result.current.cycleStart).toBe('')
    expect(result.current.isClaimable).toBe(false)
    expect(result.current.pendingChest).toBeNull()
  })

  it('clamps daysCompleted to a finite number 0-7 even with junk values', async () => {
    global.fetch = makeFetch({
      daysCompleted: null,
      completedDates: 'not-an-array',
      cycleStart: undefined,
      isClaimable: 'yes',
      pendingChest: null,
    })
    const { result } = renderHook(() => useWeeklyChest())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(Number.isFinite(result.current.daysCompleted)).toBe(true)
    expect(result.current.daysCompleted).toBe(0)
    expect(Array.isArray(result.current.completedDates)).toBe(true)
    expect(typeof result.current.cycleStart).toBe('string')
    expect(result.current.isClaimable).toBe(false)
  })


  it('skips the status request for guests (no 401 noise on public home)', async () => {
    authState.isAuthenticated = false
    authState.loading = false
    global.fetch = makeFetch({ daysCompleted: 3 })
    const { result } = renderHook(() => useWeeklyChest())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(global.fetch).not.toHaveBeenCalled()
    expect(result.current.cycleStart).toBe('')
  })

  it('treats network failure as safe defaults (not undefined)', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('offline'))
    const { result } = renderHook(() => useWeeklyChest())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.daysCompleted).toBe(0)
    expect(result.current.completedDates).toEqual([])
    expect(result.current.cycleStart).toBe('')
  })

  describe('claim flow', () => {
    const statusBody = { daysCompleted: 7, isClaimable: true, completedDates: [], cycleStart: '2026-05-06', cycleNumber: 1, pendingChest: null }
    const okJson = (body: object) => ({ ok: true, status: 200, json: async () => body })

    it('claim() goes through the authed fetch helper (bearer token attached)', async () => {
      const authFetch = await import('@/utils/authFetch')
      const spy = vi.spyOn(authFetch, 'postWithAuth').mockResolvedValue(
        okJson({ tier: 'silver', coins: 300, badgeId: 'b', cycleNumber: 1 }) as unknown as Response,
      )
      global.fetch = vi.fn().mockResolvedValue(okJson(statusBody))
      const { result } = renderHook(() => useWeeklyChest())
      await waitFor(() => expect(result.current.loading).toBe(false))
      await act(async () => { await result.current.claim() })
      expect(spy).toHaveBeenCalledWith('/api/daily/weekly-chest/claim')
      spy.mockRestore()
    })

    it('ignores a second claim() while one is in flight (double-click guard)', async () => {
      let resolvePost: (r: unknown) => void = () => {}
      const authFetch = await import('@/utils/authFetch')
      const spy = vi.spyOn(authFetch, 'postWithAuth').mockImplementation(
        () => new Promise(r => { resolvePost = r }) as Promise<Response>,
      )
      global.fetch = vi.fn().mockResolvedValue(okJson(statusBody))
      const { result } = renderHook(() => useWeeklyChest())
      await waitFor(() => expect(result.current.loading).toBe(false))
      let first: Promise<unknown> = Promise.resolve()
      let second: unknown
      await act(async () => {
        first = result.current.claim()
        second = await result.current.claim()
      })
      expect(second).toBeNull()
      expect(spy).toHaveBeenCalledTimes(1)
      expect(result.current.claiming).toBe(true)
      await act(async () => {
        resolvePost(okJson({ tier: 'gold', coins: 600, badgeId: 'b', cycleNumber: 1 }))
        await first
      })
      expect(result.current.claiming).toBe(false)
      spy.mockRestore()
    })

    it('sets claimError on a failed claim and clears it on the next attempt', async () => {
      const authFetch = await import('@/utils/authFetch')
      const spy = vi.spyOn(authFetch, 'postWithAuth')
        .mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) } as unknown as Response)
        .mockResolvedValueOnce(okJson({ tier: 'gold', coins: 600, badgeId: 'b', cycleNumber: 1 }) as unknown as Response)
      global.fetch = vi.fn().mockResolvedValue(okJson(statusBody))
      const { result } = renderHook(() => useWeeklyChest())
      await waitFor(() => expect(result.current.loading).toBe(false))
      await act(async () => { await result.current.claim() })
      expect(result.current.claimError).toBe(true)
      await act(async () => { await result.current.claim() })
      expect(result.current.claimError).toBe(false)
      spy.mockRestore()
    })

    it('treats 409 (already claimed) as a refresh, not an error', async () => {
      const authFetch = await import('@/utils/authFetch')
      const spy = vi.spyOn(authFetch, 'postWithAuth').mockResolvedValue(
        { ok: false, status: 409, json: async () => ({ error: 'Already claimed' }) } as unknown as Response,
      )
      global.fetch = vi.fn().mockResolvedValue(okJson(statusBody))
      const { result } = renderHook(() => useWeeklyChest())
      await waitFor(() => expect(result.current.loading).toBe(false))
      const before = (global.fetch as any).mock.calls.length
      await act(async () => { await result.current.claim() })
      expect(result.current.claimError).toBe(false)
      expect((global.fetch as any).mock.calls.length).toBeGreaterThan(before)
      spy.mockRestore()
    })

    it('background refresh after claim does not flip loading back to true (card must not blink out)', async () => {
      const authFetch = await import('@/utils/authFetch')
      const spy = vi.spyOn(authFetch, 'postWithAuth').mockResolvedValue(
        okJson({ tier: 'gold', coins: 600, badgeId: 'b', cycleNumber: 1 }) as unknown as Response,
      )
      global.fetch = vi.fn().mockResolvedValue(okJson(statusBody))
      const { result } = renderHook(() => useWeeklyChest())
      await waitFor(() => expect(result.current.loading).toBe(false))
      act(() => { result.current.refresh() })
      expect(result.current.loading).toBe(false)
      spy.mockRestore()
    })
  })
})