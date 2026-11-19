import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

vi.mock('@/components/multiplayer/useMultiplayerFlowState', () => ({ useMultiplayerFlowState: () => ({ entryView: 'classroom-waiting' }) }));
vi.mock('next/link', () => ({ default: ({ href, children, ...rest }: { href: string; children: React.ReactNode } & Record<string, unknown>) => <a href={href} {...rest}>{children}</a> }));
vi.mock('@/utils/profileStorage', () => ({ getStoredUsername: () => '' }));
vi.mock('@/utils/session', () => ({ clearSession: vi.fn() }));

import EduLiveEntry from '@/components/education/live/EduLiveEntry';
import { clearHostCreateRefusal, setHostCreateRefusal } from '@/app/[locale]/multiplayer/hostCreateRefusal';
import { clearSession } from '@/utils/session';

const t = (key: string) => key;

function makeEntry(overrides: Record<string, unknown> = {}) {
  return { prefilledRoom: 'AB12CD', isJoining: false, waitingForTeacher: false, displayName: 'Ms. Levi', defaultLanguage: 'en', handleJoin: vi.fn(), ...overrides } as never;
}

describe('EduLiveEntry — teacher whose room could not be reopened', () => {
  beforeEach(() => act(() => clearHostCreateRefusal()));

  it('given the server refused the host, then an error with a retry replaces the endless "opening" spinner', () => {
    const entry = makeEntry();
    act(() => setHostCreateRefusal({ code: 'AB12CD', reason: 'GAME_ALREADY_EXISTS' }));
    render(<EduLiveEntry entry={entry} urlRoom="AB12CD" isHost language="en" t={t} />);

    expect(screen.queryByTestId('edu-live-connecting')).not.toBeInTheDocument();
    expect(screen.getByTestId('edu-live-host-refused')).toHaveTextContent('eduLiveRoom.entry.hostRefusedTitle');

    fireEvent.click(screen.getByTestId('edu-live-host-retry'));
    expect((entry as { handleJoin: ReturnType<typeof vi.fn> }).handleJoin).toHaveBeenCalledWith(
      true, 'en', 'AB12CD', 'Ms. Levi Room', 'Ms. Levi', { isPrivate: true, isClassroom: true },
    );
  });

  it('given a retry is in flight, then the opening state shows instead of the error', () => {
    act(() => setHostCreateRefusal({ code: 'AB12CD', reason: 'AUTH_REQUIRED' }));
    render(<EduLiveEntry entry={makeEntry({ isJoining: true })} urlRoom="AB12CD" isHost language="en" t={t} />);
    expect(screen.getByTestId('edu-live-connecting')).toBeInTheDocument();
  });

  it('given the code has already ended, then start-a-new-game replaces retry-the-same-code', () => {
    const entry = makeEntry();
    act(() => setHostCreateRefusal({ code: 'AB12CD', reason: 'GAME_ENDED' }));
    render(<EduLiveEntry entry={entry} urlRoom="AB12CD" isHost language="en" t={t} />);

    expect(screen.getByTestId('edu-live-host-ended')).toHaveTextContent('eduLiveRoom.entry.hostEndedTitle');
    expect(screen.queryByTestId('edu-live-host-retry')).not.toBeInTheDocument();
    const cta = screen.getByTestId('edu-live-host-start-new');
    expect(cta).toHaveAttribute('href', '/en/education/classroom-game');
    fireEvent.click(cta);
    expect(clearSession).toHaveBeenCalled();
    expect((entry as { handleJoin: ReturnType<typeof vi.fn> }).handleJoin).not.toHaveBeenCalled();
  });

  it('given a student, then a host refusal is never shown to them', () => {
    act(() => setHostCreateRefusal({ code: 'AB12CD', reason: 'GAME_ALREADY_EXISTS' }));
    render(<EduLiveEntry entry={makeEntry()} urlRoom="AB12CD" isHost={false} language="en" t={t} />);
    expect(screen.queryByTestId('edu-live-host-refused')).not.toBeInTheDocument();
  });
});
