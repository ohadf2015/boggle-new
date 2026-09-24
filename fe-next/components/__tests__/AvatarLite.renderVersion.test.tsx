import { describe, it, expect } from 'vitest';
import { avatarPngSrc } from '../AvatarLite';
import { AVATAR_RENDER_VERSION } from '@/lib/avatar/renderVersion';

describe('AvatarLite PNG cache-bust includes the renderer version', () => {
  const uuid = '8f14e45f-ceea-467a-9a37-0a2b4c6d8e10';
  const cfg = { bgColor: '#FF6B35', skinColor: '#aa7755' };

  it('exposes a non-empty render version constant', () => {
    expect(typeof AVATAR_RENDER_VERSION).toBe('string');
    expect(AVATAR_RENDER_VERSION.length).toBeGreaterThan(0);
  });

  it('same config + different renderer version → different URL (art changes beat the 7-day s-maxage)', () => {
    const a = avatarPngSrc(uuid, cfg, 'r1');
    const b = avatarPngSrc(uuid, cfg, 'r2');
    expect(a).toMatch(new RegExp(`^/api/avatar/png/${uuid}\\?v=`));
    expect(a).not.toBe(b);
  });

  it('defaults to the current AVATAR_RENDER_VERSION', () => {
    expect(avatarPngSrc(uuid, cfg)).toBe(avatarPngSrc(uuid, cfg, AVATAR_RENDER_VERSION));
  });

  it('returns null for guests / missing config', () => {
    expect(avatarPngSrc('guest', cfg)).toBeNull();
    expect(avatarPngSrc(uuid, null)).toBeNull();
    expect(avatarPngSrc(undefined, cfg)).toBeNull();
  });
});
