/**
 * Admin deeplink helpers for jumping straight from a player row in the admin
 * dashboard to the corresponding PostHog person page.
 *
 * The LexiClash project lives in PostHog EU cloud, project id 151059. Both can
 * be overridden if the URL ever needs to point elsewhere (US cloud, staging
 * project, etc.) without editing the call sites.
 */

const DEFAULT_PROJECT_ID = 151059;
const DEFAULT_BASE_URL = 'https://eu.posthog.com';

interface Options {
  projectId?: number;
  baseUrl?: string;
}

export function postHogPersonUrl(
  distinctId: string | undefined,
  options: Options = {},
): string | null {
  if (!distinctId) return null;

  const projectId = options.projectId ?? DEFAULT_PROJECT_ID;
  const baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;

  return `${baseUrl}/project/${projectId}/person/${encodeURIComponent(distinctId)}`;
}
