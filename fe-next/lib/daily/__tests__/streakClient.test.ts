import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/utils/authFetch', () => ({ postWithAuth: vi.fn() }))

import { postWithAuth } from '@/utils/authFetch'
import { claimStreakMilestoneRequest, buyStreakFreezeRequest } from '../streakClient'

const reply = (status: number, body: unknown) =>
  vi.mocked(postWithAuth).mockResolvedValue({ ok: status < 300, status, json: async () => body } as Response)

describe('streak client', () => {
  beforeEach(() => vi.mocked(postWithAuth).mockReset())

  it('reads a paid milestone', async () => {
    reply(200, { claimed: true, days: 7, coins: 60 })
    expect(await claimStreakMilestoneRequest()).toEqual({ ok: true, days: 7, coins: 60, claimed: true })
  })

  it('tells "nothing to claim" apart from a failure', async () => {
    reply(400, { error: 'Nothing to claim' })
    expect(await claimStreakMilestoneRequest()).toEqual({ ok: false, reason: 'nothing' })
    reply(502, { error: 'Failed to award coins' })
    expect(await claimStreakMilestoneRequest()).toEqual({ ok: false, reason: 'failed' })
  })

  it('maps the freeze purchase refusals', async () => {
    reply(402, { error: 'insufficient_coins' })
    expect(await buyStreakFreezeRequest()).toEqual({ ok: false, reason: 'insufficient_coins' })
    reply(409, { error: 'max_held' })
    expect(await buyStreakFreezeRequest()).toEqual({ ok: false, reason: 'max_held' })
    vi.mocked(postWithAuth).mockResolvedValue({ ok: false, status: 503, json: async () => { throw new SyntaxError('html') } } as unknown as Response)
    expect(await buyStreakFreezeRequest()).toEqual({ ok: false, reason: 'failed' })
  })

  it('reads a successful purchase', async () => {
    reply(200, { freezes: 2, newBalance: 40 })
    expect(await buyStreakFreezeRequest()).toEqual({ ok: true, freezes: 2, newBalance: 40 })
  })
})
