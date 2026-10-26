/** Client-safe half of the school-identity module (no node crypto). */

export const EXTERNAL_PROVIDERS = ['google', 'microsoft', 'clever', 'classlink', 'canvas'] as const;
export type ExternalProvider = (typeof EXTERNAL_PROVIDERS)[number];

const SUPABASE_PROVIDER_MAP: Record<string, ExternalProvider> = {
  google: 'google',
  azure: 'microsoft',
};

export function isIdentityLinkingEnabled(): boolean {
  return process.env.NEXT_PUBLIC_EXTERNAL_IDENTITY_LINKING_ENABLED === 'true';
}

export function providerFromSupabase(provider: string | null | undefined): ExternalProvider | null {
  return (provider && SUPABASE_PROVIDER_MAP[provider]) || null;
}
