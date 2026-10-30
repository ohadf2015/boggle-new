import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/utils/supabase/server', () => ({ createClient: vi.fn() }))
vi.mock('@/backend/cache/redisCache', () => ({
  cacheAside: vi.fn((key, fn) => fn()),
}))

import { createClient } from '@/utils/supabase/server'
import { cacheAside } from '@/backend/cache/redisCache'
import { GET } from './route'

const req = (mode: string, date = '2026-05-12') =>
  new NextRequest(`http://localhost/api/daily/insights?mode=${mode}&date=${date}`)

describe('GET /api/daily/insights', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-05-12T12:00:00Z'))
  })
  afterEach(() => vi.useRealTimers())

  type Call = { select: string; eqs: Array<[string, unknown]>; singleCalled: boolean }
  interface DbOpts {
    today?: Array<Record<string, unknown>>
    history?: unknown[]
    recent?: unknown[]
    peers?: unknown[]
    historyGate?: Promise<unknown>
  }

  function useDb(o: DbOpts = {}) {
    const calls: Call[] = []
    const resolve = (c: Call): unknown => {
      if (c.select.includes('solved')) return { data: o.today ?? [], error: null }
      if (c.eqs.some(([k]) => k === 'player_id') && c.select.includes('puzzle_date')) return { data: o.recent ?? [], error: null }
      if (c.eqs.some(([k]) => k === 'player_id')) return o.historyGate ?? { data: o.history ?? [], error: null }
      return { data: o.peers ?? [], error: null }
    }
    const make = (c: Call): unknown => new Proxy({}, {
      get: (_t, prop) => {
        if (prop === 'then') return (ok: (v: unknown) => void, bad: (e: unknown) => void) => Promise.resolve(resolve(c)).then(ok, bad)
        if (prop === 'single' || prop === 'maybeSingle') { c.singleCalled = true; return async () => ({ data: null, error: { message: 'multiple rows' } }) }
        if (prop === 'select') return (cols: string) => { c.select = cols; return make(c) }
        if (prop === 'eq') return (k: string, v: unknown) => { c.eqs.push([k, v]); return make(c) }
        return () => make(c)
      },
    })
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: { id: 'u1' } }, error: null }) },
      from: () => { const c: Call = { select: '', eqs: [], singleCalled: false }; calls.push(c); return make(c) },
    } as never)
    return { calls }
  }

  it.each([
    ['not a date', 'banana'],
    ['wrong shape', '2026-5-12'],
    ['trailing junk', '2026-05-12x'],
    ['impossible calendar date', '2026-02-30'],
    ['future day', '2026-05-13'],
    ['older than the lookback window', '2024-01-01'],
  ])('rejects a %s with 400 and never touches the cache', async (_label, date) => {
    useDb()
    const res = await GET(req('word_hunt', encodeURIComponent(date)))
    expect(res.status).toBe(400)
    expect(cacheAside).not.toHaveBeenCalled()
  })

  it('keys the peer cache on the validated date and the player language', async () => {
    useDb({ today: [{ efficiency_score: 50, solved: false, attempts_used: 2, language: 'he' }] })
    await GET(req('word_hunt', '2026-05-11'))
    expect(vi.mocked(cacheAside).mock.calls[0][0]).toBe('lc:next:daily:peers:word_hunt:he:2026-05-11')
  })

  it('returns 401 unauthenticated', async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: null }, error: new Error() }) },
    } as never)
    expect((await GET(req('word_hunt'))).status).toBe(401)
  })

  it('returns empty insights when no today attempt', async () => {
    useDb({ today: [] })
    const body = await (await GET(req('word_hunt'))).json()
    expect(body.insights).toEqual([])
  })

  it('does not use .single() for today (a player with rows in two languages must still get insights)', async () => {
    const { calls } = useDb({
      today: [{ efficiency_score: 95, solved: true, attempts_used: 1, language: 'en' }],
      history: [{ efficiency_score: 95 }, { efficiency_score: 60 }],
    })
    const body = await (await GET(req('word_hunt'))).json()
    expect(calls.some(c => c.singleCalled)).toBe(false)
    expect(body.insights.length).toBeGreaterThan(0)
  })

  it('scopes history, recent and peers to the language of the played attempt', async () => {
    const { calls } = useDb({ today: [{ efficiency_score: 50, solved: false, attempts_used: 2, language: 'he' }] })
    await GET(req('word_hunt'))
    const rest = calls.slice(1)
    expect(rest.length).toBeGreaterThanOrEqual(3)
    for (const c of rest) expect(c.eqs).toContainEqual(['language', 'he'])
  })

  it('honours an explicit valid ?language and ignores an invalid one', async () => {
    const a = useDb({ today: [{ efficiency_score: 50, solved: false, attempts_used: 2, language: 'es' }] })
    await GET(new NextRequest('http://localhost/api/daily/insights?mode=word_hunt&date=2026-05-12&language=es'))
    expect(a.calls[0].eqs).toContainEqual(['language', 'es'])
    const b = useDb({ today: [] })
    await GET(new NextRequest('http://localhost/api/daily/insights?mode=word_hunt&date=2026-05-12&language=xx'))
    expect(b.calls[0].eqs.some(([k]) => k === 'language')).toBe(false)
  })

  it('returns at most 3 insight cards', async () => {
    useDb({
      today: [{ efficiency_score: 95, solved: true, attempts_used: 1, language: 'en' }],
      history: [{ efficiency_score: 95 }, { efficiency_score: 60 }, { efficiency_score: 50 }],
      recent: [
        { efficiency_score: 60, puzzle_date: '2026-05-11' },
        { efficiency_score: 50, puzzle_date: '2026-05-10' },
        { efficiency_score: 55, puzzle_date: '2026-05-09' },
      ],
      peers: [{ efficiency_score: 95 }, { efficiency_score: 40 }],
    })
    const body = await (await GET(req('word_hunt'))).json()
    expect(body.insights.length).toBeLessThanOrEqual(3)
    expect(body.insights.length).toBeGreaterThan(0)
  })

  it('returns percentile insight when user is in top 20%', async () => {
    useDb({
      today: [{ efficiency_score: 90, solved: false, attempts_used: 4, language: 'en' }],
      history: [{ efficiency_score: 90 }, { efficiency_score: 60 }],
      peers: [90, 50, 40, 30, 20].map(efficiency_score => ({ efficiency_score })),
    })
    const body = await (await GET(req('word_hunt'))).json()
    const p = body.insights.find((i: { type: string }) => i.type === 'percentile')
    expect(p).toBeDefined()
    expect(p.subParams.n).toBeLessThanOrEqual(20)
    expect(p.subParams.n).toBeGreaterThan(0)
  })

  it('skips percentile insight when user is below top 20%', async () => {
    useDb({
      today: [{ efficiency_score: 30, solved: false, attempts_used: 4, language: 'en' }],
      peers: [90, 80, 70, 60, 30, 20].map(efficiency_score => ({ efficiency_score })),
    })
    const body = await (await GET(req('word_hunt'))).json()
    expect(body.insights.map((i: { type: string }) => i.type)).not.toContain('percentile')
  })

  it('dispatches history, peers and recent concurrently (history held pending)', async () => {
    let resolveHistory!: (v: unknown) => void
    const historyGate = new Promise(r => { resolveHistory = r })
    const { calls } = useDb({
      today: [{ efficiency_score: 50, solved: false, attempts_used: 2, language: 'en' }],
      historyGate,
    })
    const p = GET(req('word_hunt'))
    await new Promise(r => setTimeout(r, 0))
    expect(calls.length).toBe(4)
    resolveHistory({ data: [], error: null })
    await p
  })
})
