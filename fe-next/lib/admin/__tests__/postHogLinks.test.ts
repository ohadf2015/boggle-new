/**
 * Tests for postHogPersonUrl admin deeplink helper.
 */

import { postHogPersonUrl } from '../postHogLinks';

describe('postHogPersonUrl', () => {
  it('builds an EU PostHog person URL with project id 151059 by default', () => {
    expect(postHogPersonUrl('user-abc-123'))
      .toBe('https://eu.posthog.com/project/151059/person/user-abc-123');
  });

  it('respects an override project id', () => {
    expect(postHogPersonUrl('user-x', { projectId: 9999 }))
      .toBe('https://eu.posthog.com/project/9999/person/user-x');
  });

  it('respects an override base URL (US cloud)', () => {
    expect(postHogPersonUrl('user-x', { baseUrl: 'https://us.posthog.com' }))
      .toBe('https://us.posthog.com/project/151059/person/user-x');
  });

  it('URL-encodes ids with special characters', () => {
    expect(postHogPersonUrl('user with space/slash'))
      .toBe('https://eu.posthog.com/project/151059/person/user%20with%20space%2Fslash');
  });

  it('returns null for empty / falsy ids', () => {
    expect(postHogPersonUrl('')).toBeNull();
    expect(postHogPersonUrl(undefined as unknown as string)).toBeNull();
  });
});
