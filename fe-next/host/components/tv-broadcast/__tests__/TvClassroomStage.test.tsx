import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/components/education/live/ProjectorRoundStage', () => ({ ProjectorRoundStage: () => <div data-testid="round-stage" /> }));
vi.mock('@/components/education/projector/ClassroomLivePanel', () => ({ ClassroomLivePanel: () => <div data-testid="live-panel" /> }));
vi.mock('@/components/education/projector/ProjectorLessonClaims', () => ({ ProjectorLessonClaims: ({ className }: { className?: string }) => <div data-testid="race-board" className={className} /> }));

import { TvClassroomStage } from '../TvClassroomStage';
import { ingestLessonClaimsRound } from '@/components/education/live/useLessonClaims';

const race = { roundId: 1, total: 1, claimedCount: 0, slots: [{ index: 0, first: 'S', length: 5, claim: null }] };
const base = { gameMode: 'classic', grid: undefined, wheelPuzzle: null, activityPanel: <div data-testid="activity" />, socket: null, totalWords: 0, lessonWords: [], language: 'en' as const, hostUsername: 'T', t: (k: string) => k };

describe('TvClassroomStage: the projector column', () => {
  beforeEach(() => act(() => ingestLessonClaimsRound({})));

  it('Given no race this round, When rendered, Then the live panel keeps the whole column', () => {
    render(<TvClassroomStage {...base} />);
    expect(screen.getByTestId('live-panel')).toBeInTheDocument();
    expect(screen.queryByTestId('tv-race-region')).not.toBeInTheDocument();
  });

  it('Given a race, When rendered, Then the board sits in its own capped min-h-0 region after the live panel, which keeps flex-1', () => {
    act(() => ingestLessonClaimsRound({ lessonClaims: race }));
    render(<TvClassroomStage {...base} />);
    const region = screen.getByTestId('tv-race-region');
    expect(region.className).toMatch(/min-h-0/);
    expect(region.className).toMatch(/basis-2\/5/);
    expect(region.className).toMatch(/shrink-0/);
    expect(region.className).toMatch(/(^| )min-h-\[12rem\] md:min-h-0( |$)/);
    expect(region).toContainElement(screen.getByTestId('race-board'));
    const panelRegion = screen.getByTestId('live-panel').parentElement!;
    expect(panelRegion.className).toMatch(/flex-1/);
    expect(panelRegion.className).toMatch(/min-h-0/);
    expect(panelRegion.compareDocumentPosition(region) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('Given a Word Hunt round, When rendered, Then the activity panel replaces the live panel', () => {
    render(<TvClassroomStage {...base} gameMode="word-hunt" />);
    expect(screen.getByTestId('activity')).toBeInTheDocument();
    expect(screen.queryByTestId('live-panel')).not.toBeInTheDocument();
  });
});
