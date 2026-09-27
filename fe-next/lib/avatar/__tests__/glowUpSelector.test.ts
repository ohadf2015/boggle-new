import { describe, it, expect } from 'vitest';
import { selectAvatarDisplay } from '../glowUpSelector';
import { computeAvatarSeedHash } from '../glowUpSeed';
import { DEFAULT_AVATAR_CONFIG } from '@/shared/types/customAvatar';

const freshHash = computeAvatarSeedHash(DEFAULT_AVATAR_CONFIG);
const readyRender = {
  config: DEFAULT_AVATAR_CONFIG,
  flagEnabled: true,
  renderUrl: 'https://cdn.example.com/glow/abc.png',
  renderStatus: 'ready' as const,
  renderSeedHash: freshHash,
};

describe('selectAvatarDisplay (additive-only guarantee)', () => {
  it('shows the glow-up portrait when flag on, status ready, and hash fresh', () => {
    expect(selectAvatarDisplay(readyRender)).toEqual({
      kind: 'render',
      url: 'https://cdn.example.com/glow/abc.png',
    });
  });

  it('falls back to live SVG when the feature flag is off', () => {
    expect(selectAvatarDisplay({ ...readyRender, flagEnabled: false })).toEqual({
      kind: 'live',
    });
  });

  it('falls back to live SVG when there is no render url', () => {
    expect(selectAvatarDisplay({ ...readyRender, renderUrl: null })).toEqual({
      kind: 'live',
    });
  });

  it('falls back to live SVG while a render is pending or failed', () => {
    expect(selectAvatarDisplay({ ...readyRender, renderStatus: 'pending' })).toEqual({
      kind: 'live',
    });
    expect(selectAvatarDisplay({ ...readyRender, renderStatus: 'failed' })).toEqual({
      kind: 'live',
    });
  });

  it('falls back to live SVG when the render is stale (user re-customized)', () => {
    const restyled = { ...DEFAULT_AVATAR_CONFIG, accessory: 'crown' as const };
    expect(selectAvatarDisplay({ ...readyRender, config: restyled })).toEqual({
      kind: 'live',
    });
  });
});
