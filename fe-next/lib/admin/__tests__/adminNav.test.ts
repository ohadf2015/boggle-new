/**
 * Tests for the unified admin navigation config (single source of truth).
 * Pure module — no React. The active-detection logic across combined,
 * non-adjacent route buckets is the #1 correctness target.
 */

import { describe, it, expect } from 'vitest';
import {
  ADMIN_PRIMARY_TABS,
  ADMIN_OVERFLOW_ITEMS,
  ADMIN_BUCKET_CHILDREN,
  getActiveAdminTab,
} from '../adminNav';

describe('adminNav config', () => {
  it('exposes exactly 5 primary tabs in order', () => {
    expect(ADMIN_PRIMARY_TABS.map((t) => t.key)).toEqual([
      'overview',
      'content',
      'moderation',
      'people',
      'more',
    ]);
  });

  it('does NOT contain a home tab that exits the admin zone', () => {
    const allKeys = [
      ...ADMIN_PRIMARY_TABS.map((t) => t.key),
      ...ADMIN_OVERFLOW_ITEMS.map((t) => t.key),
    ];
    expect(allKeys).not.toContain('home');
  });

  it('puts analytics, system, web-vitals, and exit in the More overflow', () => {
    const keys = ADMIN_OVERFLOW_ITEMS.map((t) => t.key);
    expect(keys).toEqual(
      expect.arrayContaining(['analytics', 'system', 'webVitals', 'exit']),
    );
  });

  it('marks the More tab as overflow with no defaultPath navigation', () => {
    const more = ADMIN_PRIMARY_TABS.find((t) => t.key === 'more');
    expect(more?.isOverflow).toBe(true);
  });

  it('attaches the moderation badge to the moderation tab only', () => {
    const badged = ADMIN_PRIMARY_TABS.filter((t) => t.badge === 'moderation');
    expect(badged.map((t) => t.key)).toEqual(['moderation']);
  });

  it('every primary tab (except more) has a labelKey and iconKey', () => {
    for (const tab of ADMIN_PRIMARY_TABS) {
      expect(tab.labelKey).toBeTruthy();
      expect(tab.iconKey).toBeTruthy();
    }
  });
});

describe('ADMIN_BUCKET_CHILDREN', () => {
  it('every child route resolves back to its own bucket via getActiveAdminTab', () => {
    for (const [bucketKey, leaves] of Object.entries(ADMIN_BUCKET_CHILDREN)) {
      for (const leaf of leaves) {
        expect(getActiveAdminTab(leaf.defaultPath)).toBe(bucketKey);
      }
    }
  });

  it('content bucket includes the non-adjacent curators + puzzle-review leaves', () => {
    const keys = ADMIN_BUCKET_CHILDREN.content.map((l) => l.key);
    expect(keys).toEqual(
      expect.arrayContaining(['curators', 'connections-review', 'dictionary']),
    );
  });

  it('people bucket bundles players, guests, teacher-access, blocklist', () => {
    const keys = ADMIN_BUCKET_CHILDREN.people.map((l) => l.key);
    expect(keys).toEqual(['players', 'guests', 'teacher-access', 'blocklist']);
  });
});

describe('getActiveAdminTab — active route detection', () => {
  // cleanPath = pathname with the /{lang}/admin base stripped

  it('matches overview on the admin root (exact)', () => {
    expect(getActiveAdminTab('')).toBe('overview');
    expect(getActiveAdminTab('/')).toBe('overview');
  });

  it('does NOT match overview on any deeper route', () => {
    expect(getActiveAdminTab('/players')).not.toBe('overview');
    expect(getActiveAdminTab('/content')).not.toBe('overview');
  });

  it('routes all content + word-management leaves to Content', () => {
    for (const p of [
      '/content',
      '/dictionary',
      '/invalid-words',
      '/milog-words',
      '/words',
      '/wikipedia-words',
      '/word-bank',
    ]) {
      expect(getActiveAdminTab(p)).toBe('content');
    }
  });

  it('routes the non-adjacent curators + puzzle-review into Content', () => {
    expect(getActiveAdminTab('/curators')).toBe('content');
    expect(getActiveAdminTab('/connections-review')).toBe('content');
  });

  it('routes players, guests, and teacher-access into People', () => {
    expect(getActiveAdminTab('/players')).toBe('people');
    expect(getActiveAdminTab('/guests')).toBe('people');
    expect(getActiveAdminTab('/teacher-access')).toBe('people');
  });

  it('matches nested detail routes via boundary-safe prefix', () => {
    expect(getActiveAdminTab('/players/abc-123')).toBe('people');
    expect(getActiveAdminTab('/guests/sess-9')).toBe('people');
    expect(getActiveAdminTab('/content/dictionary')).toBe('content');
  });

  it('matches moderation', () => {
    expect(getActiveAdminTab('/moderation')).toBe('moderation');
  });

  it('does NOT false-match across similar prefixes (/words vs /word-bank)', () => {
    // both belong to content, but the match must be by whole segment,
    // not a raw substring — guard against regressions in the matcher.
    expect(getActiveAdminTab('/word-bank')).toBe('content');
    expect(getActiveAdminTab('/words')).toBe('content');
  });

  it('returns null for an unknown route (no accidental highlight)', () => {
    expect(getActiveAdminTab('/totally-unknown')).toBeNull();
  });

  it('lights up the More tab for overflow routes (analytics/system/web-vitals)', () => {
    expect(getActiveAdminTab('/analytics')).toBe('more');
    expect(getActiveAdminTab('/system')).toBe('more');
    expect(getActiveAdminTab('/web-vitals')).toBe('more');
  });
});
