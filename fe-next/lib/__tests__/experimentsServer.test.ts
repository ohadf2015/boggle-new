/**
 * Server-side experiment variant helper.
 *
 * Built on posthog-node so /api routes can serve variant-dependent
 * payloads (reward amounts, content selection, etc) with the same
 * variant assignment logic as the client. Type-safe via registry.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetFeatureFlag = vi.fn();
const mockGetPostHogServer = vi.fn(() => ({
  getFeatureFlag: mockGetFeatureFlag,
}));

vi.mock('../posthog', () => ({
  getPostHogServer: () => mockGetPostHogServer(),
}));

import {
  getServerExperimentVariant,
  getServerExperimentVariants,
} from '../experimentsServer';
import { EXPERIMENTS } from '../experiments';

describe('getServerExperimentVariant', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the registry default when posthog-node is unavailable (no key)', async () => {
    mockGetPostHogServer.mockReturnValueOnce(null as unknown as { getFeatureFlag: typeof mockGetFeatureFlag });
    const variant = await getServerExperimentVariant('signup-prompt-cta-copy', 'user-1');
    expect(variant).toBe(EXPERIMENTS['signup-prompt-cta-copy'].default);
  });

  it('returns the registry default when distinctId is empty', async () => {
    const variant = await getServerExperimentVariant('signup-prompt-cta-copy', '');
    expect(variant).toBe(EXPERIMENTS['signup-prompt-cta-copy'].default);
    expect(mockGetFeatureFlag).not.toHaveBeenCalled();
  });

  it('forwards key + distinctId to posthog-node', async () => {
    mockGetFeatureFlag.mockResolvedValueOnce('value-prop');
    await getServerExperimentVariant('signup-prompt-cta-copy', 'user-42');
    expect(mockGetFeatureFlag).toHaveBeenCalledWith(
      'signup-prompt-cta-copy',
      'user-42',
    );
  });

  it('returns the live variant when posthog-node responds', async () => {
    mockGetFeatureFlag.mockResolvedValueOnce('urgency');
    const variant = await getServerExperimentVariant('signup-prompt-cta-copy', 'user-42');
    expect(variant).toBe('urgency');
  });

  it('clamps unknown variant strings to the default (defensive)', async () => {
    mockGetFeatureFlag.mockResolvedValueOnce('__rogue__');
    const variant = await getServerExperimentVariant('signup-prompt-cta-copy', 'user-42');
    expect(variant).toBe(EXPERIMENTS['signup-prompt-cta-copy'].default);
  });

  it('clamps boolean false (kill-switch) to the default', async () => {
    // PostHog returns `false` when a boolean flag is disabled. Multivariate
    // flags can also be disabled per-user via release conditions.
    mockGetFeatureFlag.mockResolvedValueOnce(false);
    const variant = await getServerExperimentVariant('signup-prompt-cta-copy', 'user-42');
    expect(variant).toBe(EXPERIMENTS['signup-prompt-cta-copy'].default);
  });

  it('returns the default if posthog throws (defensive — never break the request)', async () => {
    mockGetFeatureFlag.mockRejectedValueOnce(new Error('network'));
    const variant = await getServerExperimentVariant('signup-prompt-cta-copy', 'user-42');
    expect(variant).toBe(EXPERIMENTS['signup-prompt-cta-copy'].default);
  });
});

describe('getServerExperimentVariants', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns a record of variant assignments for the requested keys', async () => {
    mockGetFeatureFlag
      .mockResolvedValueOnce('value-prop')
      .mockResolvedValueOnce('score-first');

    const result = await getServerExperimentVariants(
      ['signup-prompt-cta-copy', 'boost-picker-order'] as const,
      'user-7',
    );

    expect(result).toEqual({
      'signup-prompt-cta-copy': 'value-prop',
      'boost-picker-order': 'score-first',
    });
  });

  it('falls back per-key — one bad flag does not poison others', async () => {
    mockGetFeatureFlag
      .mockResolvedValueOnce('urgency')
      .mockRejectedValueOnce(new Error('boom'));

    const result = await getServerExperimentVariants(
      ['signup-prompt-cta-copy', 'boost-picker-order'] as const,
      'user-7',
    );

    expect(result['signup-prompt-cta-copy']).toBe('urgency');
    expect(result['boost-picker-order']).toBe(
      EXPERIMENTS['boost-picker-order'].default,
    );
  });
});
