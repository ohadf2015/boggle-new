import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';

const capture = vi.hoisted(() => vi.fn());
vi.mock('@/lib/education/telemetryCore', () => ({ safeCapture: capture }));
vi.mock('@/lib/education/motion/useEduReducedMotion', () => ({ useEduReducedMotion: () => true }));
vi.mock('@/components/streak/StreakFlame', () => ({ StreakFlame: ({ days }: { days: number }) => <span data-testid="flame">{days}</span> }));

import { ClassStreakCue } from '../ClassStreakCue';

// `tr` falls back to English when the answer starts with the key, so the stub prefixes it.
const t = (key: string, _fallback?: string, params?: Record<string, string | number>) => `t(${key}${params ? JSON.stringify(params) : ''})`;
const reply = (body: unknown, ok = true) => vi.fn().mockResolvedValue({ ok, json: async () => body });

beforeEach(() => capture.mockReset());
afterEach(() => cleanup());

describe('ClassStreakCue', () => {
  it('Given a 3-day streak played today and a landed reveal, Then it says days in a row and fires one event', async () => {
    global.fetch = reply({ streak: 3, playedToday: true }) as unknown as typeof fetch;
    render(<ClassStreakCue classroomId="c1" revealed t={t} />);
    expect(await screen.findByTestId('class-streak-cue')).toHaveTextContent('"count":3');
    expect(screen.getByTestId('flame')).toBeInTheDocument();
    await waitFor(() => expect(capture).toHaveBeenCalledTimes(1));
    expect(capture).toHaveBeenCalledWith('edu_class_streak_cue_shown', { streak: 3, variant: 'kept' });
  });

  it('Given yesterday\'s streak and nothing stored today, Then it shows the streak as returned, never a claimed extra day', async () => {
    global.fetch = reply({ streak: 2, playedToday: false }) as unknown as typeof fetch;
    render(<ClassStreakCue classroomId="c1" revealed t={t} />);
    expect(await screen.findByTestId('class-streak-cue')).toHaveTextContent('"count":2');
  });

  it('Given a first day (streak 1), Then it invites the class back, with no loss wording and no flame count', async () => {
    global.fetch = reply({ streak: 1, playedToday: true }) as unknown as typeof fetch;
    render(<ClassStreakCue classroomId="c1" revealed t={t} />);
    const cue = await screen.findByTestId('class-streak-cue');
    expect(cue).toHaveAttribute('data-variant', 'invite');
    expect(cue).toHaveTextContent('eduLiveRoom.hostResults.streakInvite');
    await waitFor(() => expect(capture).toHaveBeenCalledWith('edu_class_streak_cue_shown', { streak: 1, variant: 'invite' }));
  });

  it('Given no history at all, Then the invite shows with streak 0', async () => {
    global.fetch = reply({ streak: 0, playedToday: false }) as unknown as typeof fetch;
    render(<ClassStreakCue classroomId="c1" revealed t={t} />);
    expect(await screen.findByTestId('class-streak-cue')).toHaveAttribute('data-variant', 'invite');
    await waitFor(() => expect(capture).toHaveBeenCalledWith('edu_class_streak_cue_shown', { streak: 0, variant: 'invite' }));
  });

  it('Given the reveal has not landed, Then nothing is fetched, shown or counted until it does', async () => {
    global.fetch = reply({ streak: 3, playedToday: true }) as unknown as typeof fetch;
    const { rerender } = render(<ClassStreakCue classroomId="c1" revealed={false} t={t} />);
    await new Promise((r) => setTimeout(r, 0));
    expect(global.fetch).not.toHaveBeenCalled();
    expect(screen.queryByTestId('class-streak-cue')).toBeNull();
    rerender(<ClassStreakCue classroomId="c1" revealed t={t} />);
    expect(await screen.findByTestId('class-streak-cue')).toBeInTheDocument();
    await waitFor(() => expect(capture).toHaveBeenCalledTimes(1));
  });

  it('Given a short wall, Then it hides like its neighbours so the buttons never move down', async () => {
    global.fetch = reply({ streak: 3, playedToday: true }) as unknown as typeof fetch;
    render(<ClassStreakCue classroomId="c1" revealed t={t} />);
    expect((await screen.findByTestId('class-streak-cue')).className).toContain('[@container_results_(height<56.25rem)]:hidden');
  });

  it('Given no classroom id, Then it renders nothing and never fetches', () => {
    global.fetch = vi.fn() as unknown as typeof fetch;
    render(<ClassStreakCue classroomId={undefined} revealed t={t} />);
    expect(screen.queryByTestId('class-streak-cue')).toBeNull();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it.each([
    ['a failed response', reply({}, false)],
    ['a network error', vi.fn().mockRejectedValue(new Error('offline'))],
    ['a malformed body', reply({ nope: true })],
  ])('Given %s, Then it stays hidden and fires nothing', async (_n, fetchMock) => {
    global.fetch = fetchMock as unknown as typeof fetch;
    render(<ClassStreakCue classroomId="c1" revealed t={t} />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 0));
    expect(screen.queryByTestId('class-streak-cue')).toBeNull();
    expect(capture).not.toHaveBeenCalled();
  });
});
