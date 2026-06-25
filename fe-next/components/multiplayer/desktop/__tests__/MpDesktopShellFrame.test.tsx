import { render } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import {
  MpDesktopShellFrame,
  toRosterPlayers,
  toLadderWords,
} from '../MpDesktopShellFrame';

// Mock the 4 adapters so we can assert routing + props without their deep deps.
const captured: Record<string, any> = {};
vi.mock('../StandardDesktopAdapter', () => ({
  StandardDesktopAdapter: (p: any) => {
    captured.standard = p;
    return <div data-mp-shell data-adapter="standard" />;
  },
}));
vi.mock('../BlastDesktopAdapter', () => ({
  BlastDesktopAdapter: (p: any) => {
    captured.blast = p;
    return <div data-mp-shell data-adapter="blast" />;
  },
}));
vi.mock('../WordHuntDesktopAdapter', () => ({
  WordHuntDesktopAdapter: (p: any) => {
    captured.hunt = p;
    return <div data-mp-shell data-adapter="hunt" />;
  },
}));
vi.mock('../WheelRushDesktopAdapter', () => ({
  WheelRushDesktopAdapter: (p: any) => {
    captured.wheel = p;
    return <div data-mp-shell data-adapter="wheel" />;
  },
}));

const baseProps = {
  canvas: <div data-testid="canvas">GAME</div>,
  leaderboard: [
    { username: 'me', score: 10, wordCount: 3 },
    { username: 'bot', score: 8, wordCount: 2, isBot: true },
  ],
  foundWords: [{ word: 'cat', score: 4, timestamp: 1000 }],
  socket: null,
  meId: 'me',
  roomId: 'ROOM1',
  remainingTime: 60,
  totalTime: 120,
};

describe('toRosterPlayers', () => {
  it('maps LeaderboardEntry -> RosterPlayer with userId/status/isYou', () => {
    const out = toRosterPlayers(baseProps.leaderboard as any, 'me');
    expect(out).toHaveLength(2);
    expect(out[0]).toMatchObject({
      userId: 'me',
      username: 'me',
      score: 10,
      wordCount: 3,
      status: 'connected',
      isYou: true,
    });
    expect(out[1].isYou).toBe(false);
  });
  it('handles empty + undefined leaderboard', () => {
    expect(toRosterPlayers([] as any, 'me')).toEqual([]);
    expect(toRosterPlayers(undefined as any, 'me')).toEqual([]);
  });
});

describe('toLadderWords', () => {
  it('maps FoundWord{timestamp} -> LadderWord{ts,userId}', () => {
    const out = toLadderWords(
      [{ word: 'cat', score: 4, timestamp: 1000 }] as any,
      'me',
    );
    expect(out[0]).toMatchObject({ word: 'cat', score: 4, ts: 1000, userId: 'me' });
  });
  it('defaults missing score/timestamp to 0', () => {
    const out = toLadderWords([{ word: 'dog' }] as any, 'me');
    expect(out[0]).toMatchObject({ word: 'dog', score: 0, ts: 0, userId: 'me' });
  });
  it('handles undefined foundWords', () => {
    expect(toLadderWords(undefined as any, 'me')).toEqual([]);
  });
});

describe('MpDesktopShellFrame routing', () => {
  const cases: Array<[string, string]> = [
    ['classic', 'standard'],
    ['blast', 'blast'],
    ['word-hunt', 'hunt'],
    ['wheel-rush', 'wheel'],
  ];
  it.each(cases)('mode %s -> %s adapter with [data-mp-shell]', (mode, adapter) => {
    const { container } = render(
      <MpDesktopShellFrame {...(baseProps as any)} gameMode={mode} />,
    );
    const el = container.querySelector('[data-mp-shell]');
    expect(el).toBeInTheDocument();
    expect(el?.getAttribute('data-adapter')).toBe(adapter);
  });

  it('passes mapped roster + ladder + roomId/meId to the adapter', () => {
    render(<MpDesktopShellFrame {...(baseProps as any)} gameMode="classic" />);
    expect(captured.standard.roomId).toBe('ROOM1');
    expect(captured.standard.meId).toBe('me');
    expect(captured.standard.leaderboard[0].userId).toBe('me');
    expect(captured.standard.foundWords[0].ts).toBe(1000);
    expect(captured.standard.canvas).toBeTruthy();
  });

  it('returns null / no shell for an unsupported mode', () => {
    const { container } = render(
      <MpDesktopShellFrame {...(baseProps as any)} gameMode="crossword" />,
    );
    expect(container.querySelector('[data-mp-shell]')).not.toBeInTheDocument();
  });
});
