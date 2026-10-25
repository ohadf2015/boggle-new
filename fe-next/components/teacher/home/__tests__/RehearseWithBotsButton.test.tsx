import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { readQuickLaunchIntent } from '@/components/teacher/dashboard/quickLaunchIntent';
import { peekRehearseIntent } from '@/lib/education/rehearsal';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'teacher-1' } }) }));
const getLessons = vi.fn();
vi.mock('@/lib/supabase/education', () => ({ getLessons: (...a: unknown[]) => getLessons(...a) }));

import { RehearseWithBotsButton } from '../RehearseWithBotsButton';

const t = (key: string) => key;

describe('RehearseWithBotsButton', () => {
  beforeEach(() => {
    sessionStorage.clear();
    push.mockReset();
    getLessons.mockReset();
  });

  it('Given a class, When the teacher taps Rehearse, Then the room opens on the zero-question launch and the lobby is told to start bots', async () => {
    getLessons.mockResolvedValue({ data: [{ id: 'l1', name: 'Week 6', language: 'en', words: [{ word: 'river' }] }], error: null });
    render(<RehearseWithBotsButton classroomId="class-1" source="hq" language="en" t={t} />);
    fireEvent.click(screen.getByTestId('rehearse-with-bots'));
    await waitFor(() => expect(push).toHaveBeenCalledWith('/en/education/classroom-game?flow=quickLaunch'));
    expect(readQuickLaunchIntent()).toMatchObject({ source: 'lesson', lessonId: 'l1', classroomId: 'class-1', mode: 'classic' });
    expect(peekRehearseIntent()).toEqual({ source: 'hq', classExists: true });
    expect(getLessons).toHaveBeenCalledWith('teacher-1');
  });

  it('Given no class yet, When the teacher taps Rehearse, Then the launch makes the default class and the rehearsal is marked as class-less', async () => {
    getLessons.mockResolvedValue({ data: [], error: null });
    render(<RehearseWithBotsButton classroomId={undefined} source="hq" language="he" t={t} />);
    fireEvent.click(screen.getByTestId('rehearse-with-bots'));
    await waitFor(() => expect(push).toHaveBeenCalledWith('/he/education/classroom-game?flow=quickLaunch'));
    const intent = readQuickLaunchIntent();
    expect(intent).toMatchObject({ source: 'pack', mode: 'classic' });
    expect(intent?.classroomId).toBeUndefined();
    expect(peekRehearseIntent()).toEqual({ source: 'hq', classExists: false });
  });

  it('Given the lesson lookup fails, Then the rehearsal still opens on the starter pack', async () => {
    getLessons.mockRejectedValue(new Error('offline'));
    render(<RehearseWithBotsButton classroomId="class-1" source="class" language="en" t={t} />);
    fireEvent.click(screen.getByTestId('rehearse-with-bots'));
    await waitFor(() => expect(push).toHaveBeenCalled());
    expect(readQuickLaunchIntent()).toMatchObject({ source: 'pack' });
    expect(peekRehearseIntent()).toEqual({ source: 'class', classExists: true });
  });

  it('Given the lesson lookup hangs, Then the rehearsal still opens on the starter pack within a couple of seconds', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      getLessons.mockReturnValue(new Promise(() => {}));
      render(<RehearseWithBotsButton classroomId="class-1" source="hq" language="en" t={t} />);
      fireEvent.click(screen.getByTestId('rehearse-with-bots'));
      await vi.advanceTimersByTimeAsync(2500);
      expect(push).toHaveBeenCalledWith('/en/education/classroom-game?flow=quickLaunch');
      expect(readQuickLaunchIntent()).toMatchObject({ source: 'pack' });
    } finally {
      vi.useRealTimers();
    }
  });

  it('labels the rehearsal as private when asked to', () => {
    render(<RehearseWithBotsButton classroomId="class-1" source="hq" language="en" t={t} showNote />);
    expect(screen.getByTestId('rehearse-with-bots')).toHaveTextContent('education.projectorLobby.rehearseCta');
    expect(screen.getByText('education.projectorLobby.rehearsePrivate')).toBeInTheDocument();
  });
});
