import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

const flow = vi.hoisted(() => ({ entryView: 'classroom-waiting' as string, handleClassroomNameSubmit: vi.fn() }));
vi.mock('@/components/multiplayer/useMultiplayerFlowState', () => ({ useMultiplayerFlowState: () => flow }));
vi.mock('@/components/multiplayer/ClassroomJoinNamePrompt', () => ({ default: ({ roomCode }: { roomCode: string }) => <form data-testid="name-prompt" data-room={roomCode} /> }));
vi.mock('next/link', () => ({ default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a> }));
vi.mock('@/utils/profileStorage', () => ({ getStoredUsername: () => '' }));

import EduLiveEntry from '@/components/education/live/EduLiveEntry';

const t = (key: string) => key;
const entry = { prefilledRoom: 'AB12CD', isJoining: false, waitingForTeacher: false } as never;

describe('EduLiveEntry', () => {
  beforeEach(() => {
    flow.entryView = 'classroom-waiting';
  });

  it('given a student without a stored name, when the room is known, then they are asked for a name', () => {
    flow.entryView = 'classroom-name';
    render(<EduLiveEntry entry={entry} urlRoom="AB12CD" isHost={false} language="en" t={t} />);
    expect(screen.getByTestId('name-prompt')).toHaveAttribute('data-room', 'AB12CD');
  });

  it('given a join in flight, when the room is not seated yet, then a skeleton says we are connecting', () => {
    render(<EduLiveEntry entry={entry} urlRoom="AB12CD" isHost={false} language="en" t={t} />);
    expect(screen.getByTestId('edu-live-connecting')).toHaveTextContent('eduLiveRoom.entry.connecting');
  });

  it('given the teacher, when the room is being created, then the copy says it is opening', () => {
    render(<EduLiveEntry entry={entry} urlRoom="AB12CD" isHost language="en" t={t} />);
    expect(screen.getByTestId('edu-live-connecting')).toHaveTextContent('eduLiveRoom.entry.openingRoom');
  });

  it('given the teacher has not opened the room, when the student waits, then they are told to stay', () => {
    render(<EduLiveEntry entry={{ ...(entry as object), waitingForTeacher: true } as never} urlRoom="AB12CD" isHost={false} language="en" t={t} />);
    expect(screen.getByTestId('edu-live-waiting-teacher')).toHaveTextContent('eduLiveRoom.entry.waitingTeacher');
  });

  it('given every seat is taken, when the student was sent to watch, then the room-full state replaces the spinner', () => {
    const tp = vi.fn((key: string, params?: Record<string, string | number>) => `${key}${params ? JSON.stringify(params) : ''}`);
    render(<EduLiveEntry entry={entry} urlRoom="AB12CD" isHost={false} isSpectator language="en" t={tp} />);
    expect(screen.queryByTestId('edu-live-connecting')).not.toBeInTheDocument();
    const full = screen.getByTestId('edu-live-room-full');
    expect(full).toHaveTextContent('eduLiveRoom.entry.roomFullTitle');
    expect(full).toHaveTextContent('eduLiveRoom.entry.roomFullHint{"max":50}');
  });

  it('given no room in the URL, when a student lands, then they are sent to enter a code (never the arcade)', () => {
    render(<EduLiveEntry entry={{ ...(entry as object), prefilledRoom: '' } as never} urlRoom={null} isHost={false} language="he" t={t} />);
    expect(screen.getByTestId('edu-live-no-room-cta')).toHaveAttribute('href', '/he/join');
  });

  it('given no room in the URL, when the teacher lands, then they go back to the teacher home', () => {
    render(<EduLiveEntry entry={{ ...(entry as object), prefilledRoom: '' } as never} urlRoom={null} isHost language="en" t={t} />);
    expect(screen.getByTestId('edu-live-no-room-cta')).toHaveAttribute('href', '/en/teacher');
  });
});
