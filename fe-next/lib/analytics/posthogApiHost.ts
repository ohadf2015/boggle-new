const OWN_HOSTS = new Set(['lexiclash.live', 'www.lexiclash.live']);

/** Our own domain proxies PostHog at /lcx (next.config rewrites); the native app and embeds have no Next server behind them. */
export function posthogApiHost(hostname: string, envHost: string | undefined): string {
  if (OWN_HOSTS.has(hostname)) return '/lcx';
  return envHost || 'https://eu.i.posthog.com';
}
