import { describe, it, expect, afterEach, vi } from 'vitest';
import { authModalProviders, isMicrosoftSsoEnabled } from '../authModalProviders';

const ids = (opts: { native: boolean; teacher: boolean }) => authModalProviders(opts).map((p) => p.id);

afterEach(() => vi.unstubAllEnvs());

describe('isMicrosoftSsoEnabled', () => {
  it('is on only for the exact string "true"', () => {
    expect(isMicrosoftSsoEnabled()).toBe(false);
    vi.stubEnv('NEXT_PUBLIC_MICROSOFT_SSO_ENABLED', 'TRUE');
    expect(isMicrosoftSsoEnabled()).toBe(false);
    vi.stubEnv('NEXT_PUBLIC_MICROSOFT_SSO_ENABLED', 'true');
    expect(isMicrosoftSsoEnabled()).toBe(true);
  });
});

describe('authModalProviders', () => {
  it('keeps today’s lists while the flag is off', () => {
    expect(ids({ native: false, teacher: false })).toEqual(['google', 'discord']);
    expect(ids({ native: false, teacher: true })).toEqual(['google']);
    expect(ids({ native: true, teacher: false })).toEqual(['google']);
  });

  it('adds Microsoft after Google for teachers on web when the flag is on', () => {
    vi.stubEnv('NEXT_PUBLIC_MICROSOFT_SSO_ENABLED', 'true');
    expect(ids({ native: false, teacher: true })).toEqual(['google', 'microsoft']);
  });

  it('never shows Microsoft to players or inside the native app', () => {
    vi.stubEnv('NEXT_PUBLIC_MICROSOFT_SSO_ENABLED', 'true');
    expect(ids({ native: false, teacher: false })).toEqual(['google', 'discord']);
    expect(ids({ native: true, teacher: true })).toEqual(['google']);
  });

  it('renders Microsoft as an outlined secondary button on neo tokens, not a second filled primary', () => {
    vi.stubEnv('NEXT_PUBLIC_MICROSOFT_SSO_ENABLED', 'true');
    const ms = authModalProviders({ native: false, teacher: true }).find((p) => p.id === 'microsoft')!;
    expect(ms.label).toBe('Microsoft');
    expect(ms.className).toMatch(/\bbg-transparent\b/);
    expect(ms.className).toMatch(/\bborder-neo-cream/);
    expect(ms.className).not.toMatch(/\bshadow-hard\b/);
    expect(ms.className).not.toMatch(/(gray|white|#[0-9a-f]{3,6})/i);
  });
});
