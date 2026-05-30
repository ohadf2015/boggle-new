import { describe, it, expect } from 'vitest';
import { classifyAcquisition } from '../classifyAcquisition';

describe('classifyAcquisition', () => {
  it('classifies utm_source=google as search', () => {
    expect(classifyAcquisition({ utm_source: 'google' }).kind).toBe('search');
  });

  it('classifies referrer https://www.google.com/... as search', () => {
    expect(classifyAcquisition({ referrer_source: 'https://www.google.com/search?q=lexiclash' }).kind).toBe('search');
  });

  it('classifies x.com referrer as social', () => {
    expect(classifyAcquisition({ referrer_source: 'https://x.com/foo' }).kind).toBe('social');
  });

  it('classifies utm_source=facebook as social', () => {
    expect(classifyAcquisition({ utm_source: 'facebook' }).kind).toBe('social');
  });

  it('classifies chatgpt as ai', () => {
    expect(classifyAcquisition({ referrer_source: 'https://chatgpt.com/share/x' }).kind).toBe('ai');
  });

  it('classifies perplexity referrer as ai', () => {
    expect(classifyAcquisition({ referrer_source: 'https://www.perplexity.ai/' }).kind).toBe('ai');
  });

  it('classifies crazygames as portal', () => {
    expect(classifyAcquisition({ referrer_source: 'https://www.crazygames.com/game/lexiclash' }).kind).toBe('portal');
  });

  it('classifies utm_medium=email as email', () => {
    expect(classifyAcquisition({ utm_source: 'newsletter', utm_medium: 'email' }).kind).toBe('email');
  });

  it('classifies utm_medium=push as push', () => {
    expect(classifyAcquisition({ utm_source: 'fcm', utm_medium: 'push' }).kind).toBe('push');
  });

  it('classifies utm_medium=cpc as ads', () => {
    expect(classifyAcquisition({ utm_source: 'google', utm_medium: 'cpc' }).kind).toBe('ads');
  });

  it('classifies unknown external referrer as referral', () => {
    expect(classifyAcquisition({ referrer_source: 'https://some-blog.example.com/post' }).kind).toBe('referral');
  });

  it('guest with no signals is direct', () => {
    expect(classifyAcquisition({ is_guest: true }).kind).toBe('direct');
  });

  it('authed with no signals is unknown', () => {
    expect(classifyAcquisition({ is_guest: false }).kind).toBe('unknown');
  });

  it('returns tooltip with all available signals', () => {
    const tag = classifyAcquisition({
      utm_source: 'google',
      utm_medium: 'cpc',
      utm_campaign: 'launch',
      referrer_source: 'https://google.com',
    });
    expect(tag.tooltip).toContain('utm_source=google');
    expect(tag.tooltip).toContain('utm_medium=cpc');
    expect(tag.tooltip).toContain('utm_campaign=launch');
    expect(tag.tooltip).toContain('referrer=google.com');
  });

  it('utm trumps referrer for label', () => {
    const tag = classifyAcquisition({
      utm_source: 'facebook',
      referrer_source: 'https://google.com',
    });
    expect(tag.kind).toBe('social');
    expect(tag.rawLabel).toBe('facebook');
  });

  it('handles non-URL referrer string', () => {
    expect(classifyAcquisition({ referrer_source: 'reddit' }).kind).toBe('social');
  });

  // Internal app-navigation / share tokens leak into utm_source (verified live
  // 2026-05-30: mobile-lobby, solo-confirm, copy). They are NOT acquisition
  // channels — they must collapse to 'direct', not surface as "unknown: copy".
  it('classifies internal navigation tokens as direct', () => {
    expect(classifyAcquisition({ utm_source: 'mobile-lobby' }).kind).toBe('direct');
    expect(classifyAcquisition({ utm_source: 'solo-confirm' }).kind).toBe('direct');
    expect(classifyAcquisition({ utm_source: 'copy' }).kind).toBe('direct');
    expect(classifyAcquisition({ utm_source: 'lobby' }).kind).toBe('direct');
  });

  it('does not surface an internal token as a misleading rawLabel', () => {
    expect(classifyAcquisition({ utm_source: 'mobile-lobby' }).rawLabel).toBeNull();
  });

  it('still classifies real channels that ride alongside internal traffic', () => {
    expect(classifyAcquisition({ utm_source: 'chatgpt.com' }).kind).toBe('ai');
    expect(classifyAcquisition({ utm_source: 'whatsapp' }).kind).toBe('social');
  });
});
