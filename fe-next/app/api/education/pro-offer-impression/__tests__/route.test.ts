import { describe, it, expect, vi, beforeEach } from 'vitest'

const getAuthedUser = vi.fn()
vi.mock('@/lib/auth/getAuthedUser', () => ({ getAuthedUser: (...a: unknown[]) => getAuthedUser(...a) }))
const capture = vi.fn()
vi.mock('@/lib/education/proFunnelServer', () => ({ captureProFunnelServerEvent: (e: unknown) => capture(e) }))

import { POST } from '../route'

const req = (body: unknown, headers: Record<string, string> = {}) =>
  ({ headers: new Headers(headers), text: async () => JSON.stringify(body) }) as never

describe('POST /api/education/pro-offer-impression', () => {
  beforeEach(() => {
    getAuthedUser.mockReset()
    capture.mockReset()
  })

  it('records a cookie-independent impression with source=class_created', async () => {
    getAuthedUser.mockResolvedValue({ id: 't1', email: 'teacher@school.org' })
    const res = await POST(
      req({ placement: 'class_created', stage: 'viewed', locale: 'sv', cta: 'teacher_pro_trial', offer: 'keep_after_trial' }, { 'sec-fetch-mode': 'cors' }),
    )
    expect(res.status).toBe(204)
    expect(capture).toHaveBeenCalledWith({
      distinctId: 't1',
      event: 'edu_pro_offer_impression',
      properties: expect.objectContaining({
        product: 'teacher_pro',
        placement: 'class_created',
        source: 'class_created',
        cta: 'teacher_pro_trial',
        offer: 'keep_after_trial',
        locale: 'sv',
        client_kind: 'browser',
        is_test_account: false,
      }),
    })
  })

  it('records the render step as its own event', async () => {
    getAuthedUser.mockResolvedValue({ id: 't1', email: 'teacher@school.org' })
    await POST(req({ placement: 'classroom_results', stage: 'rendered', locale: 'he', cta: 'teacher_pro', offer: 'paid' }))
    expect(capture.mock.calls[0][0]).toMatchObject({
      event: 'edu_pro_offer_rendered',
      properties: { placement: 'classroom_results', cta: 'teacher_pro', offer: 'paid', locale: 'he' },
    })
  })

  it('flags a QA alias as a test account', async () => {
    getAuthedUser.mockResolvedValue({ id: 't1', email: 'x+lexitest@gmail.com' })
    await POST(req({ placement: 'class_created', stage: 'viewed', locale: 'en' }))
    expect(capture.mock.calls[0][0].properties).toMatchObject({ is_test_account: true, test_reason: 'test_alias' })
  })

  it('records nothing for an anonymous caller, an unknown placement or an unknown stage', async () => {
    getAuthedUser.mockResolvedValue(null)
    expect((await POST(req({ placement: 'class_created', stage: 'viewed' }))).status).toBe(204)
    getAuthedUser.mockResolvedValue({ id: 't1' })
    await POST(req({ placement: 'anything', stage: 'viewed' }))
    await POST(req({ placement: 'class_created', stage: 'toString' }))
    await POST(req({ placement: 'class_created' }))
    expect(capture).not.toHaveBeenCalled()
  })

  it('drops a malformed locale and offer instead of storing them', async () => {
    getAuthedUser.mockResolvedValue({ id: 't1', email: 'teacher@school.org' })
    await POST(req({ placement: 'class_created', stage: 'viewed', locale: '<script>', offer: 'free_money' }))
    expect(capture.mock.calls[0][0].properties).toMatchObject({ locale: null, offer: null })
  })

  it('never fails, even on a bad body', async () => {
    getAuthedUser.mockResolvedValue({ id: 't1' })
    const res = await POST({ headers: new Headers(), text: async () => '{nope' } as never)
    expect(res.status).toBe(204)
  })
})
