import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

vi.mock('@/components/education/live/EduLiveEntry', () => ({ default: () => <div data-testid="entry-flow" /> }));
vi.mock('@/app/[locale]/multiplayer/MpPhaseRouter', () => ({ MpPhaseRouter: () => null, buildMpResultsProps: () => ({}) }));
vi.mock('@/components/education/live/eduLiveSurfaces', () => ({ EduLiveSurfacesProvider: ({ children }: { children: React.ReactNode }) => children }));
vi.mock('@/components/education/live/EduAbortedModal', () => ({ default: () => null }));

import { EduLiveNoRoom } from '../EduLiveNoRoom';
import { EduLivePhaseRouter } from '../EduLivePhaseRouter';

const t = (k: string) => k;
const entryProps = (prefilledRoom = '') => ({ phase: 'entry', entry: { prefilledRoom } }) as never;

describe('EduLiveNoRoom', () => {
  it('given a student with no room, when the stage renders, then the mascot speaks the title and one primary sends them to the code screen', () => {
    render(<EduLiveNoRoom isHost={false} language="he" t={t} />);
    expect(screen.getByTestId('edu-live-no-room-bubble')).toHaveTextContent('eduLiveRoom.entry.noRoomTitle');
    expect(screen.getByTestId('edu-live-no-room-cta')).toHaveAttribute('href', '/he/join');
    expect(screen.getByTestId('edu-live-no-room-secondary')).toHaveAttribute('href', '/he/student');
    expect(screen.getAllByRole('link')).toHaveLength(2);
  });

  it('given a teacher with no room, when the stage renders, then the primary goes home and the secondary opens the game picker', () => {
    render(<EduLiveNoRoom isHost language="en" t={t} />);
    expect(screen.getByTestId('edu-live-no-room-cta')).toHaveAttribute('href', '/en/teacher');
    expect(screen.getByTestId('edu-live-no-room-secondary')).toHaveAttribute('href', '/en/education/classroom-game');
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

  it('given a room in the URL, when the entry phase renders, then the join flow runs', () => {
    render(<EduLivePhaseRouter routerProps={entryProps()} urlRoom="ABC123" isTeacher={false} language="en" t={t} />);
    expect(screen.getByTestId('entry-flow')).toBeInTheDocument();
  });

  it('given a seatless watcher, when the entry phase renders, then the room-full notice still wins over the no-room stage', () => {
    render(<EduLivePhaseRouter routerProps={entryProps()} urlRoom={null} isTeacher={false} isSpectator language="en" t={t} />);
    expect(screen.getByTestId('entry-flow')).toBeInTheDocument();
  });
});
