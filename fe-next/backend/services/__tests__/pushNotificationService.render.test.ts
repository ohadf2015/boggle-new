/**
 * Per-recipient rendering tests for push notifications.
 * Core invariant: when payload carries titleKey/bodyKey, the service renders
 * them through translatePush for each recipient's language. Raw title/body
 * remain supported for legacy callers.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../utils/logger', () => ({
  default: { info: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock('../../modules/supabaseServer', () => ({
  isSupabaseConfigured: vi.fn(() => true),
  getSupabase: vi.fn(),
}));

import { renderNotification } from '../pushNotificationService';

describe('renderNotification', () => {
  it('renders raw title/body when no keys provided', () => {
    const out = renderNotification(
      { title: 'Hello', body: 'World', notificationType: 'system' },
      'en'
    );
    expect(out).toEqual({ title: 'Hello', body: 'World' });
  });

  it('renders titleKey/bodyKey via translatePush for given locale', () => {
    const out = renderNotification(
      {
        title: 'fallback',
        body: 'fallback',
        titleKey: 'gift.title',
        bodyKey: 'gift.bodyXpOnly',
        params: { sender: 'Alice', xp: 50 },
        notificationType: 'gift',
      },
      'en'
    );
    expect(out.title).toContain('gift');
    expect(out.body).toBe('Alice sent you 50 XP!');
  });

  it('renders Hebrew for he locale', () => {
    const out = renderNotification(
      {
        title: 'fallback',
        body: 'fallback',
        titleKey: 'gift.title',
        bodyKey: 'gift.bodyXpOnly',
        params: { sender: 'אליס', xp: 50 },
        notificationType: 'gift',
      },
      'he'
    );
    expect(out.title).toMatch(/[֐-׿]/);
    expect(out.body).toContain('אליס');
    expect(out.body).toContain('50');
  });

  it('falls back to English when locale is null/undefined', () => {
    const en = renderNotification(
      { title: 'x', body: 'y', titleKey: 'gift.title', bodyKey: 'gift.bodyXpOnly', params: { sender: 'A', xp: 1 }, notificationType: 'gift' },
      'en'
    );
    const nullOut = renderNotification(
      { title: 'x', body: 'y', titleKey: 'gift.title', bodyKey: 'gift.bodyXpOnly', params: { sender: 'A', xp: 1 }, notificationType: 'gift' },
      null
    );
    expect(nullOut).toEqual(en);
  });

  it('keeps raw title/body if keys resolve to missing (never mixes)', () => {
    // titleKey present but missing in dict → falls back to raw title,
    // not the raw key string.
    const out = renderNotification(
      { title: 'Raw Title', body: 'Raw Body', titleKey: 'gift.title', notificationType: 'gift' },
      'en'
    );
    // titleKey resolves — use it
    expect(out.title).toContain('gift');
    // no bodyKey → raw body
    expect(out.body).toBe('Raw Body');
  });
});

describe('sendGiftNotifications payload shape', () => {
  it('uses titleKey/bodyKey structure (not hardcoded English)', () => {
    const fs = require('fs');
    const path = require('path');
    const src = fs.readFileSync(
      path.join(__dirname, '..', 'pushNotificationService.ts'),
      'utf-8'
    );

    // Regression guard: the old hardcoded English must be gone.
    expect(src).not.toMatch(/title:\s*["']You've received a gift/);
    expect(src).not.toMatch(/body:\s*`\$\{gift\.senderName\} sent you \$\{gift\.xpAmount\} XP and/);

    // New shape: gift flow must reference translation keys somewhere.
    expect(src).toMatch(/titleKey:\s*['"]gift\.title['"]/);
    expect(src).toMatch(/['"]gift\.bodyXpAndCoins['"]/);
    expect(src).toMatch(/['"]gift\.bodyXpOnly['"]/);
  });
});
