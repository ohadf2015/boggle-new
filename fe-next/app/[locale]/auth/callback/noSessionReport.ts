// Only a URL with nothing after the path is a stray visit; any param (code, tokens, #error) is a real return.
export function isBareCallbackVisit(input: { search: string; hash: string }): boolean {
  return input.search.replace(/^\?/, '') === '' && input.hash.replace(/^#/, '') === '';
}

/**
 * A real OAuth return that finished with no session. Bare visits stay quiet so
 * a bookmark of /auth/callback is not a signup failure. Distinct from
 * growth:signup_failed — that funnel and the #2029 silence alert must not
 * count a callback loss as a dead Google button.
 */
export function callbackSessionLoss(input: {
  search: string;
  hash: string;
  provider?: string | null;
  override?: string | null;
}): { reason: string; provider: string } | null {
  if (isBareCallbackVisit(input)) return null;
  const provider = input.provider || 'unknown';
  if (input.override) return { reason: input.override, provider };
  const query = new URLSearchParams(input.search.replace(/^\?/, ''));
  const hash = new URLSearchParams(input.hash.replace(/^#/, ''));
  const oauthError = query.get('error') || hash.get('error') || hash.get('error_code');
  if (oauthError) return { reason: oauthError, provider };
  if (query.get('code')) return { reason: 'code_no_session', provider };
  if (hash.get('access_token')) return { reason: 'hash_no_session', provider };
  return { reason: 'no_session', provider };
}
