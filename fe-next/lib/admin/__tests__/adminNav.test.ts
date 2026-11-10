/**
 * Tests for the unified admin navigation config (single source of truth).
 * Pure module — no React. The active-detection logic across combined,
 * non-adjacent route buckets is the #1 correctness target.
 */

import { describe, it, expect } from 'vitest';
import {
  ADMIN_PRIMARY_TABS,
  ADMIN_ADVANCED_TABS,
  ADMIN_MORE_SHEET_ITEMS,
  ADMIN_OVERFLOW_ITEMS,
  ADMIN_BUCKET_CHILDREN,
  getActiveAdminTab,
} from '../adminNav';

describe('adminNav config', () => {
  it('exposes exactly 5 primary tabs in order', () => {
    expect(ADMIN_PRIMARY_TABS.map((t) => t.key)).toEqual([
      'overview',
      'education',
      'people',
      'analytics',
      'more',
    ]);
  });

  it('moves Content + Moderation out of the bar into the advanced group', () => {
    expect(ADMIN_ADVANCED_TABS.map((t) => t.key)).toEqual(['content', 'moderation']);
    const barKeys = ADMIN_PRIMARY_TABS.map((t) => t.key);
    expect(barKeys).not.toContain('content');
    expect(barKeys).not.toContain('moderation');
  });

  it('shows Content + Moderation in the More sheet once, ahead of the overflow items', () => {
    const keys = ADMIN_MORE_SHEET_ITEMS.map((t) => t.key);
    expect(keys).toEqual(['content', 'moderation', 'system', 'webVitals', 'exit']);
    expect(ADMIN_MORE_SHEET_ITEMS.find((i) => i.key === 'moderation')?.badge).toBe('moderation');
    expect(ADMIN_OVERFLOW_ITEMS.map((t) => t.key)).not.toEqual(expect.arrayContaining(['content']));
  });

  it('does NOT contain a home tab that exits the admin zone', () => {
    const allKeys = [
      ...ADMIN_PRIMARY_TABS.map((t) => t.key),
      ...ADMIN_OVERFLOW_ITEMS.map((t) => t.key),
    ];
    expect(allKeys).not.toContain('home');
  });

  it('puts system, web-vitals, and exit in the More overflow', () => {
    const keys = ADMIN_OVERFLOW_ITEMS.map((t) => t.key);
    expect(keys).toEqual(
      expect.arrayContaining(['system', 'webVitals', 'exit']),
    );
    expect(keys).not.toContain('analytics');
  });

  it('marks the More tab as overflow with no defaultPath navigation', () => {
    const more = ADMIN_PRIMARY_TABS.find((t) => t.key === 'more');
    expect(more?.isOverflow).toBe(true);
  });

  it('attaches the moderation badge to the moderation bucket only', () => {
    const badged = [...ADMIN_PRIMARY_TABS, ...ADMIN_ADVANCED_TABS].filter((t) => t.badge === 'moderation');
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

  it('people bucket bundles players, guests, blocklist', () => {
    const keys = ADMIN_BUCKET_CHILDREN.people.map((l) => l.key);
    expect(keys).toEqual(['players', 'guests', 'blocklist']);
  });

  it('education bucket owns dashboard, access requests, pro grants, school leads', () => {
    const keys = ADMIN_BUCKET_CHILDREN.education.map((l) => l.key);
    expect(keys).toEqual(['education', 'teacher-access', 'teacher-pro', 'school-leads']);
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

  it('routes players, guests, blocklist into People', () => {
    expect(getActiveAdminTab('/players')).toBe('people');
    expect(getActiveAdminTab('/guests')).toBe('people');
    expect(getActiveAdminTab('/blocklist')).toBe('people');
  });

  it('routes education + teacher pages (incl. detail routes) into Education', () => {
    for (const p of ['/education', '/education/teacher/u1', '/education/class/c1', '/teacher-access', '/teacher-pro', '/school-leads']) {
      expect(getActiveAdminTab(p)).toBe('education');
    }
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

  it('analytics is a primary tab now', () => {
    expect(getActiveAdminTab('/analytics')).toBe('analytics');
  });

  it('lights up the More tab for overflow routes (system/web-vitals)', () => {
    expect(getActiveAdminTab('/system')).toBe('more');
    expect(getActiveAdminTab('/web-vitals')).toBe('more');
  });
});
