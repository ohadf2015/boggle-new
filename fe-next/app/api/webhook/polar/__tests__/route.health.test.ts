/**
 * GET health check — admin-authed proof of webhook liveness.
 * configured.* are booleans only; lastEvent is the newest dot-namespaced Polar
 * row. A query failure must surface as eventsQueryable: false, never as a
 * null lastEvent that would read as "Polar never delivered".
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const h = vi.hoisted(() => ({
  adminAuthed: true,
  lastRow: null as { event_type: string; created_at: string } | null,
  queryError: null as { message: string } | null,
  supabaseMissing: false,
}))

vi.mock('@/lib/auth/adminAuth', () => ({
  verifyAdminAuth: async () =>
    h.adminAuthed
      ? { success: true, user: { id: 'admin-1', email: 'admin@lexiclash.live' } }
      : {
          success: false,
          response: new Response(JSON.stringify({ error: 'Missing authorization header' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
          }),
        },
}))

vi.mock('@/utils/supabase/admin', () => ({
  createAdminClient: () =>
    h.supabaseMissing
      ? null
      : {
          from: () => ({
            select: () => ({
              or: () => ({
                order: () => ({
                  limit: () =>
                    Promise.resolve({
                      data: h.queryError ? null : h.lastRow ? [h.lastRow] : [],
                      error: h.queryError,
                    }),
                }),
              }),
            }),
          }),
        },
}))

import { GET } from '../route'

const get = () => GET(new Request('https://www.lexiclash.live/api/webhook/polar') as never)

describe('GET /api/webhook/polar health check', () => {
  beforeEach(() => {
    h.adminAuthed = true
    h.lastRow = null
    h.queryError = null
    h.supabaseMissing = false
    process.env.POLAR_ACCESS_TOKEN = 'polar-at-1'
    process.env.POLAR_PRO_PRODUCT_ID = 'prod-pro-1'
    process.env.POLAR_WEBHOOK_SECRET = 'whsec_aGVsbG8='
  })

  it('401s a non-admin caller before touching config or the database', async () => {
    h.adminAuthed = false
    const res = await get()
    expect(res.status).toBe(401)
  })

  it('reports env presence as booleans and the last webhook event', async () => {
    h.lastRow = { event_type: 'subscription.active', created_at: '2026-10-20T20:39:01Z' }
    const res = await get()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual({
      ok: true,
      configured: {
        polarAccessToken: true,
        polarProProductId: true,
        polarWebhookSecret: true,
      },
      eventsQueryable: true,
      lastEvent: { eventType: 'subscription.active', receivedAt: '2026-10-20T20:39:01Z' },
    })
  })

  it('reports a missing POLAR_WEBHOOK_SECRET as false without leaking the value', async () => {
    delete process.env.POLAR_WEBHOOK_SECRET
    const body = await (await get()).json()
    expect(body.configured.polarWebhookSecret).toBe(false)
    expect(body.configured.polarAccessToken).toBe(true)
  })

  it('null lastEvent with a configured secret means Polar has never delivered', async () => {
    const body = await (await get()).json()
    expect(body.eventsQueryable).toBe(true)
    expect(body.lastEvent).toBeNull()
  })

  it('a failed query reports eventsQueryable false instead of a misleading null lastEvent', async () => {
    h.queryError = { message: 'boom' }
    const body = await (await get()).json()
    expect(body.eventsQueryable).toBe(false)
    expect(body.lastEvent).toBeNull()
  })

  it('survives a missing Supabase service role', async () => {
    h.supabaseMissing = true
    const body = await (await get()).json()
    expect(body.eventsQueryable).toBe(false)
  })
})
