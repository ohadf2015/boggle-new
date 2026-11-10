/**
 * @jest-environment node
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/auth/getAuthedUser', () => ({ getAuthedUser: vi.fn() }))
vi.mock('@/lib/email', () => ({ getSupabaseAdmin: vi.fn(() => ({})) }))
vi.mock('@/lib/apiRateLimit', () => ({ checkApiRateLimit: vi.fn(() => ({ success: true })) }))
vi.mock('@/utils/logger', () => ({ __esModule: true, default: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } }))
vi.mock('@/lib/daily/streakClaims.server', () => ({
  claimStreakMilestone: vi.fn(async () => ({ status: 200, body: { claimed: true, days: 3, coins: 25 } })),
  buyStreakFreeze: vi.fn(async () => ({ status: 402, body: { error: 'insufficient_coins' } })),
}))

import { NextRequest } from 'next/server'
import { getAuthedUser } from '@/lib/auth/getAuthedUser'
import { checkApiRateLimit } from '@/lib/apiRateLimit'
import { claimStreakMilestone, buyStreakFreeze } from '@/lib/daily/streakClaims.server'
import { POST as claimMilestone } from '../milestone/route'
import { POST as buyFreeze } from '../freeze/route'

const req = (path: string) => new NextRequest(`http://localhost/api/daily/streak/${path}`, { method: 'POST' })

describe('streak reward routes', () => {
  beforeEach(() => vi.clearAllMocks())

  it.each([
    ['milestone', claimMilestone],
    ['freeze', buyFreeze],
  ] as const)('%s: refuses a signed-out request', async (path, handler) => {
    vi.mocked(getAuthedUser).mockResolvedValue(null)
    expect((await handler(req(path))).status).toBe(401)
  })

  it('milestone: claims for the verified user only', async () => {
    vi.mocked(getAuthedUser).mockResolvedValue({ id: 'u1' } as never)
    const res = await claimMilestone(req('milestone'))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ claimed: true, days: 3, coins: 25 })
    expect(vi.mocked(claimStreakMilestone).mock.calls[0][1]).toBe('u1')
  })

  it('freeze: passes the purchase outcome through', async () => {
    vi.mocked(getAuthedUser).mockResolvedValue({ id: 'u1' } as never)
    const res = await buyFreeze(req('freeze'))
    expect(res.status).toBe(402)
    expect(vi.mocked(buyStreakFreeze).mock.calls[0][1]).toBe('u1')
  })

  it('freeze: rate limited', async () => {
    vi.mocked(checkApiRateLimit).mockReturnValueOnce({ success: false } as never)
    expect((await buyFreeze(req('freeze'))).status).toBe(429)
  })
})
