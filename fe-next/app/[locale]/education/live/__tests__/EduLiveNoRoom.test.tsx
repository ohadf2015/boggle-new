import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

vi.mock('@/components/education/live/EduLiveEntry', () => ({ default: () => <div data-testid="entry-flow" /> }));
vi.mock('@/app/[locale]/multiplayer/MpPhaseRouter', () => ({ MpPhaseRouter: () => null, buildMpResultsProps: () => ({}) }));
vi.mock('@/components/education/live/eduLiveSurfaces', () => ({ EduLiveSurfacesProvider: ({ children }: { children: React.ReactNode }) => children }));
vi.mock('@/components/education/live/EduAbortedModal', () => ({ default: () => null }));
vi.mock('@/components/education/join/DeadEndPracticeLink', () => ({
  DeadEndPracticeLink: ({ state, className }: { state: string; className?: string }) => (
    <span data-testid="dead-end-practice" data-state={state} className={className} role="link">practice</span>
  ),
}));

import { EduLiveNoRoom } from '../EduLiveNoRoom';
import { EduLivePhaseRouter } from '../EduLivePhaseRouter';

const t = (k: string) => k;
const entryProps = (prefilledRoom = '') => ({ phase: 'entry', entry: { prefilledRoom } }) as never;

describe('EduLiveNoRoom', () => {
  it('given a student with no room (or one just removed from the room), when the stage renders, then practice is the loud action and the code screen comes second', () => {
    render(<EduLiveNoRoom isHost={false} language="he" t={t} />);
    expect(screen.getByTestId('edu-live-no-room-bubble')).toHaveTextContent('eduLiveRoom.entry.noRoomTitle');
    const practice = screen.getByTestId('dead-end-practice');
    expect(practice).toHaveAttribute('data-state', 'no_room');
    const code = screen.getByTestId('edu-live-no-room-secondary');
    expect(code).toHaveAttribute('href', '/he/join');
    expect(code).toHaveTextContent('eduLiveRoom.entry.enterCode');
    expect(practice.compareDocumentPosition(code) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.queryByTestId('edu-live-no-room-cta')).toBeNull();
    expect(screen.getAllByRole('link')).toHaveLength(2);
  });

  it('given any viewer, when the stage renders, then no gradient paints the backdrop', () => {
    const { container } = render(<EduLiveNoRoom isHost={false} language="en" t={t} />);
    expect(container.innerHTML).not.toMatch(/gradient/);
  });

  it('given a teacher with no room, when the stage renders, then the primary goes home and the secondary opens the game picker', () => {
    render(<EduLiveNoRoom isHost language="en" t={t} />);
    expect(screen.getByTestId('edu-live-no-room-cta')).toHaveAttribute('href', '/en/teacher');
    expect(screen.getByTestId('edu-live-no-room-secondary')).toHaveAttribute('href', '/en/education/classroom-game');
    expect(screen.queryByTestId('dead-end-practice')).toBeNull();
  });

  it('given reduced motion, when the stage renders, then every ambient loop sits behind motion-safe', () => {
    const { container } = render(<EduLiveNoRoom isHost={false} language="en" t={t} />);
    const animated = Array.from(container.querySelectorAll('[class*="animate-"]'));
    expect(animated.length).toBeGreaterThan(0);
    for (const el of animated) {
      for (const cls of el.className.split(/\s+/).filter((c) => c.includes('animate-'))) expect(cls.startsWith('motion-safe:')).toBe(true);
    }
  });
});

describe('EduLivePhaseRouter entry', () => {
  it('given no room anywhere, when the entry phase renders, then the live route shows the no-room stage', () => {
    render(<EduLivePhaseRouter routerProps={entryProps()} urlRoom={null} isTeacher={false} language="en" t={t} />);
    expect(screen.getByTestId('edu-live-no-room')).toBeInTheDocument();
    expect(screen.queryByTestId('entry-flow')).toBeNull();
  });

  it('given a student the teacher just removed (the kick reloads the page without its room), when the entry phase renders, then a practice round is offered', () => {
    render(<EduLivePhaseRouter routerProps={entryProps()} urlRoom={null} isTeacher={false} language="en" t={t} />);
    expect(screen.getByTestId('dead-end-practice')).toHaveAttribute('data-state', 'no_room');
  });

  it('given a room in the URL, when the entry phase renders, then the join flow runs', () => {
    render(<EduLivePhaseRouter routerProps={entryProps()} urlRoom="ABC123" isTeacher={false} language="en" t={t} />);
    expect(screen.getByTestId('entry-flow')).toBeInTheDocument();
  });

  it('given a seatless watcher, when the entry phase renders, then the room-full notice still wins over the no-room stage', () => {
    render(<EduLivePhaseRouter routerProps={entryProps()} urlRoom={null} isTeacher={false} isSpectator language="en" t={t} />);
    expect(screen.getByTestId('entry-flow')).toBeInTheDocument();
  });
});
