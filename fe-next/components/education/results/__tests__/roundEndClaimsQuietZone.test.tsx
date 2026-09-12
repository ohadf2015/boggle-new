/**
 * The round-end surfaces must RAISE the quiet zone, not rely on being lucky.
 *
 * Both live on `/multiplayer`, which is deliberately not a game route and never
 * sets the in-game body class — which is exactly why a route list kept missing
 * them and three separate prompts (share, cookie sheet, style picker) each got
 * to cover a podium. A surface that must not be covered says so itself.
 *
 * The claim must also OUTLIVE the render: the zone stays up while the recap is
 * mounted and for the grace window after it goes, so a prompt on an 800ms timer
 * cannot slip into the gap.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('@/utils/confettiUtils', () => ({
  fireRankConfetti: vi.fn(),
  fireVictoryConfetti: vi.fn(),
  cleanupConfetti: vi.fn(),
}));
vi.mock('@/lib/education/roundEndSound', () => ({
  playRoundEndCue: vi.fn(() => null),
  ROUND_WIN_SOUND: '/sounds/education-round-win.mp3',
  CLASS_SWEEP_SOUND: '/sounds/education-class-sweep.mp3',
}));

import { ClassroomTvResults } from '../ClassroomTvResults';
import {
  OVERLAY_QUIET_ZONE_ATTR,
  OVERLAY_QUIET_ZONE_GRACE_MS,
  isOverlayQuietZoneActive,
  resetOverlayQuietZoneForTests,
} from '@/lib/overlayQuietZone';
import type { ClassroomSummary } from '@/shared/types/classroom';

const summary: ClassroomSummary = {
  teacherName: 'Ms. Cohen',
  lessonNames: ['Unit 3'],
  lessonIds: ['lesson-1'],
  totalWords: 4,
  classFoundCount: 2,
  coverage: [
    { word: 'photon', foundBy: ['Maya'] },
    { word: 'atom', foundBy: ['Noa'] },
    { word: 'quark', foundBy: [] },
    { word: 'boson', foundBy: [] },
  ],
  missedWords: ['quark', 'boson'],
  masteryByPlayer: { Maya: { found: 2, total: 4 }, Noa: { found: 1, total: 4 } },
  podium: [
    { username: 'Maya', score: 90, rank: 1 },
    { username: 'Noa', score: 70, rank: 2 },
  ],
};

const t = (key: string) => key;

describe('round-end surfaces claim the overlay quiet zone', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    window.sessionStorage.clear();
    resetOverlayQuietZoneForTests();
  });
  afterEach(() => {
    resetOverlayQuietZoneForTests();
    vi.useRealTimers();
  });

  it('the projector results hold the zone while mounted', () => {
    const { unmount } = render(<ClassroomTvResults summary={summary} t={t} />);
    expect(isOverlayQuietZoneActive()).toBe(true);
    expect(document.body.getAttribute(OVERLAY_QUIET_ZONE_ATTR)).toContain('classroom');
    unmount();
  });

  it('keeps the zone through the grace window after the recap goes away', () => {
    const { unmount } = render(<ClassroomTvResults summary={summary} t={t} />);
    unmount();

    expect(isOverlayQuietZoneActive()).toBe(true);
    vi.advanceTimersByTime(OVERLAY_QUIET_ZONE_GRACE_MS + 100);
    expect(isOverlayQuietZoneActive()).toBe(false);
  });
});
