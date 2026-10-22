/**
 * Where a Teacher Pro checkout is allowed to be sandbox.
 *
 * LexiClash production runs on Railway, not Vercel. A guard that only looks at
 * VERCEL_ENV never fires on the live host, so POLAR_ENVIRONMENT=sandbox still
 * creates a sandbox.polar.sh URL (Polar returns 201 and collects nothing).
 */

const LIVE_HOSTS = new Set(['lexiclash.live', 'www.lexiclash.live'])

export function hostFromHeader(value: string | null | undefined): string {
  return (value ?? '').split(',')[0].trim().split(':')[0].toLowerCase()
}

export function isLiveLexiClashHost(host: string | null | undefined): boolean {
  return LIVE_HOSTS.has(hostFromHeader(host))
}

/**
 * True for a production deploy. PR previews (`pr-*`) stay false so they can
 * still opt into sandbox. An unnamed or preview Railway env is not production.
 */
export function isProductionBillingDeploy(env: NodeJS.ProcessEnv = process.env): boolean {
  if (env.VERCEL_ENV === 'production') return true
  const railway = env.RAILWAY_ENVIRONMENT_NAME ?? ''
  if (!railway || railway.startsWith('pr-')) return false
  return railway === 'production'
}

export function isSandboxCheckoutUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase()
    return host === 'sandbox.polar.sh' || host.endsWith('.sandbox.polar.sh')
  } catch {
    return false
  }
}

/**
 * Production (Vercel, Railway, or the live host) must not mint or return a
 * sandbox checkout. Preview and localhost may.
 */
export function productionRefusesSandbox(input: {
  env?: NodeJS.ProcessEnv
  hosts?: Array<string | null | undefined>
  polarEnvironment?: string | undefined
  checkoutUrl?: string
} = {}): boolean {
  const env = input.env ?? process.env
  const liveHost = (input.hosts ?? []).some((host) => isLiveLexiClashHost(host))
  if (!isProductionBillingDeploy(env) && !liveHost) return false
  const polarEnvironment = input.polarEnvironment ?? env.POLAR_ENVIRONMENT
  if (polarEnvironment === 'sandbox') return true
  return Boolean(input.checkoutUrl && isSandboxCheckoutUrl(input.checkoutUrl))
}
