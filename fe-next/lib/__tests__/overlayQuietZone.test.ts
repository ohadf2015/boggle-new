/**
 * The quiet zone is the one rule every auto-opening prompt obeys. These tests
 * pin the three things the round-end bug needed: it is TRUE while a surface
 * claims it, it STAYS true for a grace window after the claim goes away (the
 * gap between "round over" and "the recap chunk mounted"), and it publishes
 * itself on <body> so a capture agent can prove it was active.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  OVERLAY_QUIET_ZONE_ATTR,
  OVERLAY_QUIET_ZONE_GRACE_MS,
  claimOverlayQuietZone,
  isOverlayQuietZoneActive,
  noteOverlayQuietZoneGameOver,
  resetOverlayQuietZoneForTests,
  subscribeOverlayQuietZone,
} from '../overlayQuietZone';
import { IN_GAME_BODY_CLASS } from '../inGameSurface';

describe('overlayQuietZone', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    document.body.className = '';
    resetOverlayQuietZoneForTests();
  });

  afterEach(() => {
    resetOverlayQuietZoneForTests();
    document.body.className = '';
    vi.useRealTimers();
  });

  it('is inactive on an ordinary page', () => {
    expect(isOverlayQuietZoneActive()).toBe(false);
  });

  it('is active while a surface holds a claim', () => {
    const release = claimOverlayQuietZone('classroom-results');
    expect(isOverlayQuietZoneActive()).toBe(true);
    release();
  });

  it('DEFERS rather than drops: stays active through the grace window after the claim releases', () => {
    const release = claimOverlayQuietZone('classroom-results');
    release();

    expect(isOverlayQuietZoneActive()).toBe(true);
    vi.advanceTimersByTime(OVERLAY_QUIET_ZONE_GRACE_MS - 1);
    expect(isOverlayQuietZoneActive()).toBe(true);
    vi.advanceTimersByTime(2);
    expect(isOverlayQuietZoneActive()).toBe(false);
  });

  it('keeps the zone while a second claim overlaps the first', () => {
    const first = claimOverlayQuietZone('projector-results');
    const second = claimOverlayQuietZone('student-recap');
    first();
    expect(isOverlayQuietZoneActive()).toBe(true);
    second();
    vi.advanceTimersByTime(OVERLAY_QUIET_ZONE_GRACE_MS + 10);
    expect(isOverlayQuietZoneActive()).toBe(false);
  });

  it('reads the live in-game body class without any claim', () => {
    document.body.classList.add(IN_GAME_BODY_CLASS);
    expect(isOverlayQuietZoneActive()).toBe(true);
  });

  it('covers round end even when nothing claims: game-over opens the grace window', () => {
    noteOverlayQuietZoneGameOver();
    expect(isOverlayQuietZoneActive()).toBe(true);
    vi.advanceTimersByTime(OVERLAY_QUIET_ZONE_GRACE_MS + 10);
    expect(isOverlayQuietZoneActive()).toBe(false);
  });

  it('notifies subscribers when the zone opens and when the grace window expires', () => {
    const seen: boolean[] = [];
    const unsubscribe = subscribeOverlayQuietZone(() => seen.push(isOverlayQuietZoneActive()));

    const release = claimOverlayQuietZone('classroom-results');
    expect(seen).toContain(true);
    release();
    seen.length = 0;
    vi.advanceTimersByTime(OVERLAY_QUIET_ZONE_GRACE_MS + 10);
    expect(seen).toContain(false);
    unsubscribe();
  });

  it('publishes the active reason on <body> so a live capture can prove it', () => {
    const release = claimOverlayQuietZone('classroom-results');
    expect(document.body.getAttribute(OVERLAY_QUIET_ZONE_ATTR)).toBe('classroom-results');
    release();
    vi.advanceTimersByTime(OVERLAY_QUIET_ZONE_GRACE_MS + 10);
    expect(document.body.hasAttribute(OVERLAY_QUIET_ZONE_ATTR)).toBe(false);
  });
});
