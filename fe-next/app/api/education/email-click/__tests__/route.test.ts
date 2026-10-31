import { describe, it, expect, vi, beforeEach } from 'vitest'

const getAuthedUser = vi.fn()
vi.mock('@/lib/auth/getAuthedUser', () => ({ getAuthedUser: (...a: unknown[]) => getAuthedUser(...a) }))
const capture = vi.fn()
vi.mock('@/lib/education/proFunnelServer', () => ({ captureProFunnelServerEvent: (e: unknown) => capture(e) }))

import { GET } from '../route'

const req = (qs: string) =>
  ({ nextUrl: new URL(`https://www.lexiclash.live/api/education/email-click?${qs}`), headers: new Headers() }) as never

describe('GET /api/education/email-click', () => {
  beforeEach(() => {
    getAuthedUser.mockReset()
    capture.mockReset()
  })

  it('records the approval-email click for a signed-in teacher and redirects to the upgrade page', async () => {
    getAuthedUser.mockResolvedValue({ id: 't1', email: 'teacher@school.org' })
    const res = await GET(req('c=approval_email&l=sv'))
    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toBe('https://www.lexiclash.live/sv/teacher/upgrade?source=approval_email')
    expect(capture).toHaveBeenCalledWith({
      distinctId: 't1',
      event: 'edu_pro_email_clicked',
      properties: expect.objectContaining({ source: 'approval_email', locale: 'sv', signed_in: true, is_test_account: false }),
    })
  })

  it('still records an anonymous click without a person profile', async () => {
    getAuthedUser.mockResolvedValue(null)
    await GET(req('c=approval_email&l=he'))
    const ev = capture.mock.calls[0][0]
    expect(ev.distinctId).toMatch(/^email-click-/)
    expect(ev.properties).toMatchObject({ signed_in: false, $process_person_profile: false, locale: 'he' })
  })

  it('never redirects off-site and ignores unknown campaigns or locales', async () => {
    getAuthedUser.mockResolvedValue(null)
    const res = await GET(req('c=https://evil.example&l=../../x'))
    expect(res.headers.get('location')).toBe('https://www.lexiclash.live/en/teacher/upgrade')
    expect(capture).not.toHaveBeenCalled()
  })

  it('redirects even when tracking throws', async () => {
    getAuthedUser.mockRejectedValue(new Error('auth down'))
    capture.mockImplementation(() => { throw new Error('ph down') })
    const res = await GET(req('c=approval_email&l=ja'))
    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toBe('https://www.lexiclash.live/ja/teacher/upgrade?source=approval_email')
  })
})

describe('GET /api/education/email-click — class report email', () => {
  it('tracks the personal class-report email and lands on the upgrade page in the teacher language', async () => {
    getAuthedUser.mockReset()
    capture.mockReset()
    getAuthedUser.mockResolvedValue(null)
    const res = await GET(req('c=class_report_email&l=he'))
    expect(res.headers.get('location')).toBe('https://www.lexiclash.live/he/teacher/upgrade?source=class_report_email')
    expect(capture.mock.calls[0][0]).toMatchObject({ event: 'edu_pro_email_clicked', properties: { source: 'class_report_email', signed_in: false } })
  })
})
