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
import { ROUND_FRAME_LANE_CLASS } from '../useRoundToastLane';
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

import { ClassroomBoardProvider } from '@/components/education/live/classroomBoard';

describe('MpRoundLayout classroom skin', () => {
  it('given an arcade round, then the frame and its rails keep their navy look', () => {
    render(<MpRoundLayout {...props()} />);
    expect(screen.getByTestId('mp-round-layout').className).toContain('bg-neo-navy');
    expect(screen.getByTestId('mp-rail-roster').className).toContain('bg-neo-navy-light');
  });

  it('given a classroom round, then the frame stands on the sky page and no navy or white ink is left in it', () => {
    render(<ClassroomBoardProvider value><MpRoundLayout {...props()} /></ClassroomBoardProvider>);
    const root = screen.getByTestId('mp-round-layout');
    expect(root).toHaveClass('bg-edu-page');
    expect(screen.getByTestId('mp-rail-roster')).toHaveClass('bg-edu-surface');
    const html = root.outerHTML.replace(screen.getByTestId('canvas').outerHTML, '');
    expect(html).not.toMatch(/bg-neo-navy|text-neo-white|border-neo-white/);
  });
});
