// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

const createCheckout = vi.fn()
vi.mock('@/lib/polar', () => ({
  getPolarClient: () => ({ createCheckout }),
  getProProductId: () => process.env.POLAR_PRO_PRODUCT_ID,
  probeCheckoutUrl: async () => ({ ok: true, status: 200 }),
}))
vi.mock('@/utils/supabase/admin', () => ({ createAdminClient: () => null }))
vi.mock('@/lib/subscriptions', () => ({ logSubscriptionEvent: async () => undefined }))
vi.mock('@/lib/education/accessTrialServer', () => ({ accessTrialExpiryAny: async () => null }))
vi.mock('@/lib/posthog', () => ({ getPostHogServer: () => null }))
const getAuthedUser = vi.fn()
vi.mock('@/lib/auth/getAuthedUser', () => ({
  getAuthedUser: (...args: unknown[]) => getAuthedUser(...args),
}))

import { POST } from '../route'

const APP = 'https://www.lexiclash.live'
const REPORT = '/he/teacher/reports?classroomId=c-1'

function checkoutFrom(referer: string | null, body?: unknown, host = 'www.lexiclash.live') {
  const headers: Record<string, string> = { host }
  if (referer) headers.referer = referer
  return POST(
    new NextRequest(`${APP}/api/subscription/checkout`, {
      method: 'POST',
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  )
}

function passedReturnPath() {
  return createCheckout.mock.calls[0]?.[0]?.returnPath
}

describe('POST /api/subscription/checkout return path', () => {
  beforeEach(() => {
    createCheckout.mockReset()
    createCheckout.mockResolvedValue({ url: 'https://polar.sh/checkout/x', id: 'c-id' })
    getAuthedUser.mockReset()
    getAuthedUser.mockResolvedValue({ id: 'u1', email: 'teacher@school.example' })
    process.env.POLAR_ACCESS_TOKEN = 'polar-token'
    process.env.POLAR_PRO_PRODUCT_ID = 'prod-pro-1'
    process.env.NEXT_PUBLIC_APP_URL = APP
  })

  afterEach(() => {
    delete process.env.POLAR_ACCESS_TOKEN
    delete process.env.POLAR_PRO_PRODUCT_ID
    delete process.env.NEXT_PUBLIC_APP_URL
  })

  it('returns a checkout started on a class report to that report', async () => {
    const res = await checkoutFrom(`${APP}${REPORT}`, { trial: true, locale: 'he' })
    expect(res.status).toBe(200)
    expect(passedReturnPath()).toBe(REPORT)
  })

  it('works for the bodyless paid checkout too', async () => {
    await checkoutFrom(`${APP}${REPORT}`)
    expect(passedReturnPath()).toBe(REPORT)
  })

  it('ignores a referer from another origin', async () => {
    await checkoutFrom(`https://evil.example${REPORT}`)
    expect(passedReturnPath()).toBeUndefined()
  })

  it('passes nothing when there is no referer', async () => {
    await checkoutFrom(null)
    expect(passedReturnPath()).toBeUndefined()
  })

  it('accepts the request host when the app URL points at another origin (preview deploys)', async () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://www.lexiclash.live'
    await checkoutFrom(`https://preview-1.up.railway.app${REPORT}`, undefined, 'preview-1.up.railway.app')
    expect(passedReturnPath()).toBe(REPORT)
  })

  it('prefers an explicit returnTo in the body over the referer', async () => {
    await checkoutFrom(`${APP}/en/teacher`, { returnTo: '/en/teacher/reports?classroomId=c-9' })
    expect(passedReturnPath()).toBe('/en/teacher/reports?classroomId=c-9')
  })

  it.each(['https://evil.example/he/teacher', '//evil.example/he/teacher', '/he/teacher/../../evil'])(
    'refuses an off-site returnTo %s and falls back to the referer',
    async (returnTo) => {
      await checkoutFrom(`${APP}${REPORT}`, { returnTo })
      expect(passedReturnPath()).toBe(REPORT)
    },
  )

  it('refuses an off-site returnTo with no referer', async () => {
    await checkoutFrom(null, { returnTo: 'https://evil.example/he/teacher' })
    expect(passedReturnPath()).toBeUndefined()
  })

  it('drops a non-string returnTo and falls back to the referer', async () => {
    await checkoutFrom(`${APP}${REPORT}`, { returnTo: 42 })
    expect(passedReturnPath()).toBe(REPORT)
  })
})
