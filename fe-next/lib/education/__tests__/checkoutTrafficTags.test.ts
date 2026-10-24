import { describe, it, expect } from 'vitest'
import { buildCheckoutTrafficTags, checkoutClientKind, testEmailReason } from '../checkoutTrafficTags'

const headers = (h: Record<string, string>) => new Headers(h)

describe('testEmailReason', () => {
  it.each([
    ['qa1@lexiclash.test', 'test_domain'],
    ['someone+lexitest1020@gmail.com', 'test_alias'],
    ['ohad+qa@gmail.com', 'test_alias'],
    ['T+E2E-run@Gmail.com', 'test_alias'],
  ])('Given %s, Then it is flagged %s', (email, reason) => {
    expect(testEmailReason(email)).toBe(reason)
  })

  it.each(['teacher@school.org', 'mrs.smith+class4b@gmail.com', '', null, undefined, 'not-an-email'])(
    'Given %s, Then it is a real address',
    (email) => {
      expect(testEmailReason(email as string | null | undefined)).toBeNull()
    },
  )
})

describe('checkoutClientKind', () => {
  it('Given Fetch Metadata headers, Then it is a browser', () => {
    expect(checkoutClientKind(headers({ 'sec-fetch-mode': 'cors', 'sec-fetch-site': 'same-origin' }))).toBe('browser')
  })
  it('Given no Fetch Metadata (curl, node fetch), Then it is a script', () => {
    expect(checkoutClientKind(headers({ 'user-agent': 'curl/8.5' }))).toBe('script')
  })
})

describe('buildCheckoutTrafficTags', () => {
  it('Given a real teacher in a browser, Then nothing marks it as test', () => {
    expect(
      buildCheckoutTrafficTags({
        trial: true,
        email: 'teacher@school.org',
        profileIsTest: false,
        headers: headers({ 'sec-fetch-mode': 'cors' }),
      }),
    ).toEqual({
      stage: 'checkout_url_created',
      trial: true,
      checkout_mode: 'trial',
      is_test_account: false,
      test_reason: null,
      client_kind: 'browser',
    })
  })

  it('Given the profile flag, Then it wins over a clean email', () => {
    const tags = buildCheckoutTrafficTags({ trial: false, email: 'a@b.org', profileIsTest: true, headers: headers({}) })
    expect(tags).toMatchObject({ is_test_account: true, test_reason: 'profile_flag', checkout_mode: 'paid', client_kind: 'script' })
  })

  it('Given an unknown profile flag and a QA alias, Then the alias flags it', () => {
    const tags = buildCheckoutTrafficTags({ trial: false, email: 'x+lexitest@gmail.com', profileIsTest: null, headers: headers({}) })
    expect(tags).toMatchObject({ is_test_account: true, test_reason: 'test_alias' })
  })
})
