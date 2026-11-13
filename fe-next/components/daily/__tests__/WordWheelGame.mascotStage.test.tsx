import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/utils/growthTracking', () => ({
  trackGameStart: vi.fn(),
  trackGameEnd: vi.fn(),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en', t: (k: string) => k }),
}));

vi.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => ({
    playTileSelectSound: vi.fn(),
    playWordAcceptedSound: vi.fn(),
    playWordRejectedSound: vi.fn(),
    playComboSound: vi.fn(),
    playLegendaryWordSound: vi.fn(),
    playEpicVictorySound: vi.fn(),
    playCountdownBeep: vi.fn(),
    playBoardShuffleSound: vi.fn(),
    playButtonClickSound: vi.fn(),
  }),
}));

vi.mock('@/hooks/useWordWheelKeyboard', () => ({
  useWordWheelKeyboard: () => ({ keyboardFocused: false }),
}));

vi.mock('../WordWheelPixiRing', () => ({
  __esModule: true,
  default: () => <div data-testid="pixi-ring-stub" />,
}));

vi.mock('next/dynamic', () => ({
  __esModule: true,
  default: () => () => <div data-testid="dynamic-stub" />,
}));

vi.mock('@/utils/dailyChallenge/wordWheelGeneration', () => ({
  isValidWordWheelWord: () => true,
}));

vi.mock('@/utils/dailyChallenge/wordWheelScoring', () => ({
  scoreWord: () => 5,
}));

const mascotProps = vi.hoisted(() => ({ current: null as null | Record<string, unknown> }));
vi.mock('@/components/mascot/GameMascotReactions', () => ({
  GameMascotReactions: (props: Record<string, unknown>) => {
    mascotProps.current = props;
    return <div data-testid="mascot-mock" />;
  },
}));
import WordWheelGame from '../WordWheelGame';
import type { WordWheelPuzzle } from '@/utils/dailyChallenge/wordWheelGeneration';

const puzzle = {
  centerLetter: 'A', outerLetters: ['B', 'C', 'D', 'E', 'F', 'G'], validWords: ['CAB'], language: 'en',
} as unknown as WordWheelPuzzle;

const renderGame = () =>
  render(<WordWheelGame puzzle={puzzle} duration={60} onComplete={vi.fn()} onValidateWord={vi.fn().mockResolvedValue(true)} onEffect={vi.fn()} language="en" />);

const realMatchMedia = window.matchMedia;
function onDesktop(matches: boolean) {
  window.matchMedia = ((q: string) => ({
    matches, media: q, onchange: null,
    addEventListener: () => {}, removeEventListener: () => {}, addListener: () => {}, removeListener: () => {}, dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

beforeEach(() => {
  mascotProps.current = null;
  global.fetch = vi.fn().mockResolvedValue({ ok: false }) as unknown as typeof fetch;
});
afterEach(() => {
  window.matchMedia = realMatchMedia;
});

describe('Word Wheel mascot placement', () => {
  it('Given a phone, the mascot takes no layout room: word line, wheel and actions sit directly in the cluster', () => {
    onDesktop(false);
    renderGame();
    const cluster = screen.getByTestId('wheel-cluster');
    expect(screen.queryByTestId('wheel-mascot-stage')).toBeNull();
    expect(cluster.contains(screen.getByTestId('word-builder'))).toBe(true);
    expect(screen.getByTestId('wheel-orbit').parentElement).toBe(cluster);
    for (const el of [...cluster.children] as HTMLElement[]) {
      expect(el.className).not.toContain('flex-[1_0_auto]');
    }
  });

  it('Given a phone, the mascot only reacts (no slapstick gags over the game)', () => {
    onDesktop(false);
    renderGame();
    expect(mascotProps.current?.personality).toBe('quiet');
  });

  it('Given a phone, the mascot stays on the wheel corner the whole game', () => {
    onDesktop(false);
    renderGame();
    expect(screen.getByTestId('wheel-orbit').contains(screen.getByTestId('mascot-mock'))).toBe(true);
    expect(mascotProps.current?.persistent).toBe(true);
  });

  it('Given the desktop shell, the mascot is not drawn on the wheel', () => {
    onDesktop(true);
    renderGame();
    expect(screen.getByTestId('wheel-orbit').contains(screen.getByTestId('mascot-mock'))).toBe(false);
    expect(mascotProps.current?.persistent).toBeFalsy();
  });

  it('Given the desktop shell, gags play in the rail mascot spot only', () => {
    onDesktop(true);
    renderGame();
    expect(mascotProps.current?.personality).toBe('full');
    expect(mascotProps.current?.stages).toEqual([screen.getByTestId('shell-mascot')]);
  });
});
