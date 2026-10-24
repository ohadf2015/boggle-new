import { describe, it, expect, vi, beforeEach } from 'vitest'

const getAuthedUser = vi.fn()
vi.mock('@/lib/auth/getAuthedUser', () => ({ getAuthedUser: (...a: unknown[]) => getAuthedUser(...a) }))
const capture = vi.fn()
vi.mock('@/lib/education/proFunnelServer', () => ({ captureProFunnelServerEvent: (e: unknown) => capture(e) }))

import { POST } from '../route'

const req = (body: unknown, headers: Record<string, string> = {}) =>
  ({ headers: new Headers(headers), text: async () => JSON.stringify(body) }) as never

describe('POST /api/education/pro-cta-click', () => {
  beforeEach(() => {
    getAuthedUser.mockReset()
    capture.mockReset()
  })

  it('records a signed-in teacher tap server-side with placement and browser kind', async () => {
    getAuthedUser.mockResolvedValue({ id: 't1', email: 'teacher@school.org' })
    const res = await POST(req({ placement: 'class_created', locale: 'he', cta: 'teacher_pro_trial' }, { 'sec-fetch-mode': 'cors' }))
    expect(res.status).toBe(204)
    expect(capture).toHaveBeenCalledWith({
      distinctId: 't1',
      event: 'edu_pro_cta_clicked',
      properties: expect.objectContaining({
        placement: 'class_created', locale: 'he', cta: 'teacher_pro_trial', client_kind: 'browser', is_test_account: false,
      }),
    })
  })

  it('flags a QA alias', async () => {
    getAuthedUser.mockResolvedValue({ id: 't1', email: 'x+lexitest@gmail.com' })
    await POST(req({ placement: 'class_created', locale: 'en' }))
    expect(capture.mock.calls[0][0].properties).toMatchObject({ is_test_account: true, test_reason: 'test_alias', client_kind: 'script' })
  })

  it('records nothing for an anonymous caller or an unknown placement', async () => {
    getAuthedUser.mockResolvedValue(null)
    expect((await POST(req({ placement: 'class_created' }))).status).toBe(204)
    getAuthedUser.mockResolvedValue({ id: 't1' })
    await POST(req({ placement: 'anything' }))
    expect(capture).not.toHaveBeenCalled()
  })

  it('never fails, even on a bad body', async () => {
    getAuthedUser.mockResolvedValue({ id: 't1' })
    const res = await POST({ headers: new Headers(), text: async () => '{nope' } as never)
    expect(res.status).toBe(204)
  })
})
