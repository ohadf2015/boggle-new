/**
 * MpRoundLayout — the one in-round frame for host AND joiner, every mode:
 * one HUD (exit · timer · score+combo · rank), a live roster, the mode canvas,
 * and the juice lanes. Shown points always come from the server
 * (`wordAccepted.score` via mpFeedback), never a client-computed number.
 */
import React, { memo } from 'react';
import { render, screen, act, fireEvent } from '@testing-library/react';

const { sounds, reduce } = vi.hoisted(() => ({
  sounds: {
    playTimerHeartbeatSound: vi.fn(),
    playLeadChangeSound: vi.fn(),
    playComboSound: vi.fn(),
    playOpponentScoredSound: vi.fn(),
  },
  reduce: { value: false },
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (k: string, p?: Record<string, unknown>) => (p ? `${k}:${JSON.stringify(p)}` : k),
    dir: 'ltr',
    language: 'en',
  }),
}));
vi.mock('@/contexts/SoundEffectsContext', () => ({ useSoundEffects: () => sounds }));
vi.mock('@/contexts/AccessibilityContext', () => ({ useShouldReduceMotion: () => reduce.value }));
vi.mock('@/components/ui/CircularTimer', () => ({ default: () => <div data-testid="ring" /> }));
vi.mock('@/components/ui/AnimatedCounter', () => ({ default: ({ value }: { value: number }) => <span data-testid="counter">{value}</span> }));
vi.mock('@/components/Avatar', () => ({ default: () => <i /> }));
const { mute, registered } = vi.hoisted(() => ({
  mute: { allMuted: false, toggle: vi.fn(), label: 'Mute', title: 'Mute' },
  registered: { count: 0 },
}));
vi.mock('@/hooks/useMasterMute', () => ({ useMasterMute: () => mute }));
vi.mock('@/contexts/NavigationContext', () => ({
  useRegisterHeaderAudioControl: () => { registered.count += 1; },
}));

import { MpRoundLayout, type MpRoundLayoutProps } from '../MpRoundLayout';
import { recordWordAccepted, recordWordRejected, resetMpFeedback } from '@/lib/multiplayer/mpFeedback';

const canvasRenders = { count: 0 };
const Canvas = memo(function Canvas() {
  canvasRenders.count += 1;
  return <div data-testid="canvas">board</div>;
});
const CANVAS = <Canvas />;

function props(over: Partial<MpRoundLayoutProps> = {}): MpRoundLayoutProps {
  return {
    meId: 'me',
    gameMode: 'classic',
    remainingTime: 60,
    totalTime: 60,
    leaderboard: [
      { username: 'bot', score: 10 },
      { username: 'me', score: 4 },
      { username: 'amy', score: 0 },
    ],
    users: [{ username: 'me' }, { username: 'bot', isBot: true }, { username: 'amy' }],
    foundWords: [{ word: 'cat', score: 4 }],
    comboLevel: 0,
    revealed: true,
    onExit: vi.fn(),
    canvas: CANVAS,
    ...over,
  };
}

describe('MpRoundLayout', () => {
  beforeEach(() => {
    act(() => resetMpFeedback());
    canvasRenders.count = 0;
    Object.values(sounds).forEach((f) => f.mockClear());
    reduce.value = false;
  });

  it('renders ONE hud: exit, timer, my server score and my rank', () => {
    render(<MpRoundLayout {...props()} />);
    expect(screen.getAllByTestId('mp-hud-bar')).toHaveLength(1);
    expect(screen.getAllByTestId('mp-timer')).toHaveLength(1);
    expect(screen.getByTestId('mp-score-chip')).toHaveTextContent('4');
    expect(screen.getByTestId('mp-rank-value')).toHaveTextContent('#2');
    expect(screen.getByTestId('mp-rank-chip')).toHaveTextContent('/3');
  });

  it('owns mute inside the HUD (the global floating FAB stands down — it covered the score)', () => {
    render(<MpRoundLayout {...props()} />);
    expect(registered.count).toBeGreaterThan(0);
    const btn = screen.getByTestId('mp-round-mute');
    expect(screen.getByTestId('mp-hud-bar')).toContainElement(btn);
    fireEvent.click(btn);
    expect(mute.toggle).toHaveBeenCalled();
  });

  it('shows ONE clock: the big m:ss digits, not a second label inside the ring', () => {
    render(<MpRoundLayout {...props()} />);
    expect(screen.getByTestId('mp-timer').className).toContain('[&_svg~div]:hidden');
  });

  it('the exit button hands off to the view (which confirms)', () => {
    const onExit = vi.fn();
    render(<MpRoundLayout {...props({ onExit })} />);
    fireEvent.click(screen.getByTestId('mp-back-leave'));
    expect(onExit).toHaveBeenCalledTimes(1);
  });

  it('shows the live roster with scores (joiner never reads "0 players")', () => {
    render(<MpRoundLayout {...props({ leaderboard: [] })} />);
    const seats = screen.getAllByTestId('mp-roster-seat');
    expect(new Set(seats.map((s) => s.getAttribute('data-player')))).toEqual(new Set(['me', 'bot', 'amy']));
  });

  it('keeps the board mounted but hidden until GO, then drops it in', () => {
    const { rerender } = render(<MpRoundLayout {...props({ revealed: false })} />);
    const stage = screen.getByTestId('mp-round-canvas');
    expect(stage.className).toContain('invisible');
    expect(stage).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByTestId('canvas')).toBeInTheDocument();
    rerender(<MpRoundLayout {...props({ revealed: true })} />);
    expect(screen.getByTestId('mp-round-canvas').className).not.toContain('invisible');
    expect(screen.getByTestId('mp-round-canvas').className).toContain('boardDrop');
  });

  it('a timer tick or leaderboard update never re-renders the canvas', () => {
    const { rerender } = render(<MpRoundLayout {...props()} />);
    const settled = canvasRenders.count;
    for (let s = 59; s > 40; s--) rerender(<MpRoundLayout {...props({ remainingTime: s })} />);
    rerender(<MpRoundLayout {...props({ remainingTime: 40, leaderboard: [{ username: 'me', score: 30 }, { username: 'bot', score: 10 }] })} />);
    expect(canvasRenders.count).toBe(settled);
  });

  it('an accepted word bumps the score chip and flies "+N" with the SERVER points', () => {
    render(<MpRoundLayout {...props()} />);
    act(() => recordWordAccepted({ word: 'cats', score: 14, comboLevel: 1 }));
    expect(screen.getByTestId('mp-score-gain')).toHaveTextContent('+14');
    expect(screen.getByTestId('mp-floater')).toHaveTextContent('+14');
  });

  it('keeps at most 3 floaters alive', () => {
    render(<MpRoundLayout {...props()} />);
    for (let i = 0; i < 5; i++) act(() => recordWordAccepted({ word: `w${i}`, score: 3 + i }));
    expect(screen.getAllByTestId('mp-floater').length).toBeLessThanOrEqual(3);
  });

  it('combo level 3+ fires the loud ON FIRE callout and the combo sound', () => {
    render(<MpRoundLayout {...props({ comboLevel: 3 })} />);
    act(() => recordWordAccepted({ word: 'blaze', score: 30, comboLevel: 3 }));
    const callout = screen.getByTestId('mp-callout');
    expect(callout).toHaveTextContent('mpUi.round.onFire');
    expect(callout).toHaveAttribute('data-tone', 'loud');
    expect(sounds.playComboSound).toHaveBeenCalled();
  });

  it('a rejection is QUIET (small, no loud callout)', () => {
    render(<MpRoundLayout {...props()} />);
    act(() => recordWordRejected('xq', 'too-short'));
    const callout = screen.getByTestId('mp-callout');
    expect(callout).toHaveAttribute('data-tone', 'quiet');
    expect(callout).toHaveTextContent('mpUi.round.reject.tooShort');
  });

  it('a word someone found first shows "{name} got it first · +N" (quiet)', () => {
    render(<MpRoundLayout {...props()} />);
    act(() => recordWordRejected('dog', 'found-by-other', { foundBy: 'bot', points: 2 }));
    const callout = screen.getByTestId('mp-callout');
    expect(callout).toHaveTextContent('mpUi.round.gotItFirst');
    expect(callout).toHaveTextContent('"name":"bot"');
    expect(callout).toHaveTextContent('"points":2');
  });

  it('someone passing me: quiet pink callout + the rank chip flips', () => {
    const base = [{ username: 'me', score: 10 }, { username: 'bot', score: 5 }];
    const { rerender } = render(<MpRoundLayout {...props({ leaderboard: base })} />);
    rerender(<MpRoundLayout {...props({ leaderboard: [{ username: 'bot', score: 15 }, { username: 'me', score: 10 }] })} />);
    expect(screen.getByTestId('mp-callout')).toHaveTextContent('mpUi.round.passedYou');
    expect(screen.getByTestId('mp-callout')).toHaveAttribute('data-tone', 'quiet');
    expect(screen.getByTestId('mp-rank-value').className).toContain('animate-mp-flip');
  });

  it('me passing someone: loud "You passed {name}!"', () => {
    const base = [{ username: 'bot', score: 10 }, { username: 'me', score: 5 }];
    const { rerender } = render(<MpRoundLayout {...props({ leaderboard: base })} />);
    rerender(<MpRoundLayout {...props({ leaderboard: [{ username: 'me', score: 20 }, { username: 'bot', score: 10 }] })} />);
    expect(screen.getByTestId('mp-callout')).toHaveTextContent('mpUi.round.youPassed');
    expect(screen.getByTestId('mp-callout')).toHaveAttribute('data-tone', 'loud');
  });

  it('heartbeat once per second in the last 5 seconds', () => {
    const { rerender } = render(<MpRoundLayout {...props({ remainingTime: 7 })} />);
    rerender(<MpRoundLayout {...props({ remainingTime: 6 })} />);
    expect(sounds.playTimerHeartbeatSound).not.toHaveBeenCalled();
    rerender(<MpRoundLayout {...props({ remainingTime: 5 })} />);
    rerender(<MpRoundLayout {...props({ remainingTime: 4 })} />);
    expect(sounds.playTimerHeartbeatSound).toHaveBeenCalledTimes(2);
  });

  it('slams TIME! at zero', () => {
    const { rerender } = render(<MpRoundLayout {...props({ remainingTime: 1 })} />);
    rerender(<MpRoundLayout {...props({ remainingTime: 0 })} />);
    expect(screen.getByTestId('mp-time-up')).toHaveTextContent('mpUi.round.timeUp');
  });

  it('docks a found-count pill', () => {
    render(<MpRoundLayout {...props({ foundWords: [{ word: 'a' }, { word: 'b' }, { word: 'c' }] })} />);
    expect(screen.getByTestId('mp-found-pill')).toHaveTextContent('"count":3');
  });
});
