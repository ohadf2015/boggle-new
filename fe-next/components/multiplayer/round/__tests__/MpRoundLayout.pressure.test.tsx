/**
 * The calm dial on the in-round PLAYERS roster. A hidden leaderboard means the
 * roster stops being a live standings table: no scores, and the seats stop
 * arriving in score order (the order itself is the leak) — alphabetical
 * instead, so the rail reads as "who is here", never "who is winning".
 */
import React, { memo } from 'react';
import { render, screen, act } from '@testing-library/react';

const { sounds } = vi.hoisted(() => ({
  sounds: {
    playTimerHeartbeatSound: vi.fn(),
    playLeadChangeSound: vi.fn(),
    playComboSound: vi.fn(),
    playOpponentScoredSound: vi.fn(),
  },
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (k: string, p?: Record<string, unknown>) => (p ? `${k}:${JSON.stringify(p)}` : k),
    dir: 'ltr',
    language: 'en',
  }),
}));
vi.mock('@/contexts/SoundEffectsContext', () => ({ useSoundEffects: () => sounds }));
vi.mock('@/contexts/AccessibilityContext', () => ({ useShouldReduceMotion: () => true }));
vi.mock('@/components/ui/CircularTimer', () => ({ default: () => <div data-testid="ring" /> }));
vi.mock('@/components/ui/AnimatedCounter', () => ({ default: ({ value }: { value: number }) => <span data-testid="counter">{value}</span> }));
vi.mock('@/components/Avatar', () => ({ default: () => <i /> }));
vi.mock('@/hooks/useMasterMute', () => ({
  useMasterMute: () => ({ allMuted: false, toggle: vi.fn(), label: 'Mute', title: 'Mute' }),
}));
vi.mock('@/contexts/NavigationContext', () => ({ useRegisterHeaderAudioControl: () => {} }));

import { MpRoundLayout, type MpRoundLayoutProps } from '../MpRoundLayout';
import { resetMpFeedback } from '@/lib/multiplayer/mpFeedback';
import { useClassroomPressureStore } from '@/hooks/gameState/classroomPressureStore';

const Canvas = memo(function Canvas() {
  return <div data-testid="canvas">board</div>;
});

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
    canvas: <Canvas />,
    ...over,
  };
}

function railSeatIds(): string[] {
  const rail = screen.getByTestId('mp-rail-roster');
  return Array.from(rail.querySelectorAll('[data-player]')).map((n) => n.getAttribute('data-player') as string);
}

function railScoreSpans(): number {
  return screen.getByTestId('mp-rail-roster').querySelectorAll('[data-player] span.text-neo-lime').length;
}

describe('MpRoundLayout — leaderboard=hidden roster', () => {
  beforeEach(() => {
    act(() => resetMpFeedback());
  });
  afterEach(() => {
    useClassroomPressureStore.getState().setClassroomPressure(null);
  });

  it('drops the scores and the score ordering: alphabetical seats, no numbers', () => {
    useClassroomPressureStore.getState().setClassroomPressure({ leaderboard: 'hidden', timer: 'full', speedScoring: true });
    render(<MpRoundLayout {...props()} />);
    expect(railSeatIds()).toEqual(['amy', 'bot', 'me']);
    expect(railScoreSpans()).toBe(0);
  });

  it('no pressure: score order and live scores, exactly as before', () => {
    render(<MpRoundLayout {...props()} />);
    expect(railSeatIds()).toEqual(['bot', 'me', 'amy']);
    expect(railScoreSpans()).toBe(3);
  });
});
