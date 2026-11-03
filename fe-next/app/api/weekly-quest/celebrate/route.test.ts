/**
 * @jest-environment node
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/auth/getAuthedUser', () => ({ getAuthedUser: vi.fn() }))
vi.mock('@/utils/supabase/admin', () => ({ createAdminClient: vi.fn() }))
vi.mock('@/utils/logger', () => ({ __esModule: true, default: { error: vi.fn(), log: vi.fn(), warn: vi.fn(), info: vi.fn() } }))

import { getAuthedUser } from '@/lib/auth/getAuthedUser'
import { createAdminClient } from '@/utils/supabase/admin'
import { POST } from './route'

const QUEST = '0b6f3c1e-1111-4222-8333-444455556666'
const req = (body: unknown) =>
  new NextRequest('http://localhost/api/weekly-quest/celebrate', { method: 'POST', body: JSON.stringify(body) })

function setup(rows: Array<{ id: string }> | null, error: { message: string } | null = null, user: unknown = { id: 'u1' }) {
  vi.mocked(getAuthedUser).mockResolvedValue(user as never)
  const eqs: Array<[string, unknown]> = []
  const chain: any = {
    update: vi.fn(() => chain),
    eq: vi.fn((c: string, v: unknown) => { eqs.push([c, v]); return chain }),
    select: vi.fn(() => Promise.resolve({ data: rows, error })),
  }
  vi.mocked(createAdminClient).mockReturnValue({ from: vi.fn(() => chain) } as never)
  return { chain, eqs }
}

describe('POST /api/weekly-quest/celebrate', () => {
  beforeEach(() => vi.clearAllMocks())

  it('401 when signed out', async () => {
    setup([], null, null)
    expect((await POST(req({ questId: QUEST }))).status).toBe(401)
  })

  it('400 on a missing or non-uuid questId', async () => {
    setup([])
    expect((await POST(req({}))).status).toBe(400)
    expect((await POST(req({ questId: 'nope' }))).status).toBe(400)
  })

  it('flips the flag only for the caller\'s own completed, not-yet-celebrated quest', async () => {
    const { chain, eqs } = setup([{ id: QUEST }])
    const res = await POST(req({ questId: QUEST }))
    expect(await res.json()).toEqual({ newlyCelebrated: true })
    expect(chain.update).toHaveBeenCalledWith({ celebrated: true })
    expect(eqs).toEqual(expect.arrayContaining([['id', QUEST], ['player_id', 'u1'], ['completed', true], ['celebrated', false]]))
  })

  it('already celebrated (no row matched) is a 200 with newlyCelebrated:false', async () => {
    setup([])
    const res = await POST(req({ questId: QUEST }))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ newlyCelebrated: false })
  })

  it('500 when the update errors', async () => {
    setup(null, { message: 'db down' })
    expect((await POST(req({ questId: QUEST }))).status).toBe(500)
  })
})
