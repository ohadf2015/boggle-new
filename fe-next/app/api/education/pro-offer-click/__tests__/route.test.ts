import { describe, it, expect, vi, beforeEach } from 'vitest'

const getAuthedUser = vi.fn()
vi.mock('@/lib/auth/getAuthedUser', () => ({ getAuthedUser: (...a: unknown[]) => getAuthedUser(...a) }))
const capture = vi.fn()
vi.mock('@/lib/education/proFunnelServer', () => ({ captureProFunnelServerEvent: (e: unknown) => capture(e) }))

import { POST } from '../route'

const req = (body: unknown, headers: Record<string, string> = {}) =>
  ({ headers: new Headers(headers), text: async () => (typeof body === 'string' ? body : JSON.stringify(body)) }) as never

describe('POST /api/education/pro-offer-click', () => {
  beforeEach(() => {
    getAuthedUser.mockReset()
    capture.mockReset()
  })

  it.each(['class_created', 'classroom_results', 'access_success', 'dashboard'])('records edu_pro_offer_clicked with source=%s', async (placement) => {
    getAuthedUser.mockResolvedValue({ id: 't1', email: 'teacher@school.org' })
    const res = await POST(req({ placement, locale: 'sv', cta: 'teacher_pro_trial', offer: 'keep_after_trial' }, { 'sec-fetch-mode': 'cors' }))
    expect(res.status).toBe(204)
    expect(capture).toHaveBeenCalledWith({
      distinctId: 't1',
      event: 'edu_pro_offer_clicked',
      properties: expect.objectContaining({
        product: 'teacher_pro',
        placement,
        source: placement,
        cta: 'teacher_pro_trial',
        offer: 'keep_after_trial',
        locale: 'sv',
        is_test_account: false,
      }),
    })
  })

  it('flags a QA alias as a test account', async () => {
    getAuthedUser.mockResolvedValue({ id: 't1', email: 'x+lexitest@gmail.com' })
    await POST(req({ placement: 'dashboard', locale: 'en', cta: 'teacher_pro', offer: 'paid' }))
    expect(capture.mock.calls[0][0].properties).toMatchObject({ is_test_account: true, cta: 'teacher_pro', offer: 'paid' })
  })

  it('records nothing for an anonymous caller or an unknown placement, and survives a bad body', async () => {
    getAuthedUser.mockResolvedValue(null)
    expect((await POST(req({ placement: 'dashboard' }))).status).toBe(204)
    getAuthedUser.mockResolvedValue({ id: 't1' })
    expect((await POST(req({ placement: 'anything' }))).status).toBe(204)
    expect((await POST(req('{not json'))).status).toBe(204)
    expect(capture).not.toHaveBeenCalled()
  })

  it('still answers 204 when auth throws', async () => {
    getAuthedUser.mockRejectedValue(new Error('down'))
    expect((await POST(req({ placement: 'dashboard' }))).status).toBe(204)
  })
  it('tags the copy A/B bucket from the teacher id on the A/B surfaces, not on access_success', async () => {
    const { proCopyVariant } = await import('@/lib/education/pro/proCopyExperiment')
    getAuthedUser.mockResolvedValue({ id: 'teacher-uuid-1', email: 'teacher@school.org' })
    await POST(req({ placement: 'classroom_results', locale: 'en', cta: 'teacher_pro_trial', offer: 'trial', variant: 'zzz' }))
    expect(capture.mock.calls[0][0].properties).toMatchObject({
      experiment: 'edu_pro_copy_v1',
      copy_variant: proCopyVariant('teacher-uuid-1'),
      '$feature/edu_pro_copy_v1': proCopyVariant('teacher-uuid-1'),
    })
    await POST(req({ placement: 'access_success', locale: 'en', cta: 'teacher_pro_trial', offer: 'trial' }))
    expect(capture.mock.calls[1][0].properties).toMatchObject({ experiment: null, copy_variant: null })
  })
})
