/**
 * Payment provider abstraction.
 *
 * PAYMENTS_PROVIDER selects the merchant-of-record used for all checkout,
 * webhook, and portal flows. Lemon Squeezy is kept dormant (store rejected
 * 2026-08-02); Polar.sh is the active provider. Switching back is one env var.
 */

export type PaymentsProvider = 'polar' | 'lemonsqueezy'

export function getPaymentsProvider(): PaymentsProvider {
  const value = (process.env.PAYMENTS_PROVIDER || 'polar').toLowerCase()
  return value === 'lemonsqueezy' ? 'lemonsqueezy' : 'polar'
}

export function isPolarEnabled(): boolean {
  return getPaymentsProvider() === 'polar'
}
