import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { HighlightPlayer } from '../HighlightPlayer';
import type { RankedMoment } from '@/lib/blast/highlightTypes';

// Mock contexts
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));

vi.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => ({
    playBlastHighlightStingerSound: vi.fn(),
    setGameActive: vi.fn(),
  }),
}));

vi.mock('@/components/motion/AdaptiveMotion', () => ({
  useSkipAnimations: () => false,
}));

vi.mock('@/utils/growthTracking', () => ({
  trackHighlightStart: vi.fn(),
  trackHighlightSkipped: vi.fn(),
}));

// Mock child components
vi.mock('../LetterboxBars', () => ({
  LetterboxBars: ({ active }: { active: boolean }) => <div data-testid="letterbox-bars">{active ? 'active' : 'inactive'}</div>,
}));

vi.mock('../ScoreReadout', () => ({
  ScoreReadout: ({ score, visible }: { score: number; visible: boolean }) => (
    <div data-testid="score-readout">{visible ? `+${score}` : 'hidden'}</div>
  ),
}));

vi.mock('../WordReveal', () => ({
  WordReveal: ({ word, visible }: { word: string; visible: boolean }) => (
    <div data-testid="word-reveal">{visible ? word : 'hidden'}</div>
  ),
}));

vi.mock('../MascotReaction', () => ({
  MascotReaction: ({ epicness, visible }: { epicness: number; visible: boolean }) => (
    <div data-testid="mascot-reaction">{visible ? `epic:${epicness}` : 'hidden'}</div>
  ),
}));

vi.mock('../BoardClearedCard', () => ({
  BoardClearedCard: ({ finalScore, visible }: { finalScore: number; visible: boolean }) => (
    <div data-testid="board-cleared-card">{visible ? `score:${finalScore}` : 'hidden'}</div>
  ),
}));

vi.mock('@/hooks/useHighlightClock', () => ({
  useHighlightClock: () => ({
    state: {
      elapsed: 0,
      rate: 1.0,
      phase: 'idle',
      clipIndex: 0,
    },
    start: vi.fn(),
    stop: vi.fn(),
    setRate: vi.fn(),
    setPhase: vi.fn(),
    setClipIndex: vi.fn(),
  }),
}));

const fakeMoment: RankedMoment = {
  event: {
    kind: 'word',
    t: 1000,
    word: 'CAT',
    score: 100,
    path: [],
    combo: 0,
    specialTilesHit: [],
    preGrid: [],
    postGrid: [],
    effectsFired: [],
  },
  epicness: 100,
  caption: 'biggestWord',
  isFinalClear: false,
};

describe('HighlightPlayer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders with skip button having translated label', () => {
    render(<HighlightPlayer moments={[fakeMoment]} finalScore={1234} onComplete={vi.fn()} />);
    expect(screen.getByRole('button', { name: /blast\.highlight\.skipLabel/ })).toBeInTheDocument();
  });

  it('fires onComplete when skip clicked', () => {
    const onComplete = vi.fn();
    render(<HighlightPlayer moments={[fakeMoment]} finalScore={0} onComplete={onComplete} />);
    fireEvent.click(screen.getByRole('button', { name: /blast\.highlight\.skipLabel/ }));
    expect(onComplete).toHaveBeenCalled();
  });

  it('renders WordReveal component', () => {
    render(<HighlightPlayer moments={[fakeMoment]} finalScore={500} onComplete={vi.fn()} />);
    expect(screen.getByTestId('word-reveal')).toBeInTheDocument();
  });

  it('renders letterbox, score, mascot, and board-cleared components', () => {
    render(<HighlightPlayer moments={[fakeMoment]} finalScore={500} onComplete={vi.fn()} />);
    expect(screen.getByTestId('letterbox-bars')).toBeInTheDocument();
    expect(screen.getByTestId('score-readout')).toBeInTheDocument();
    expect(screen.getByTestId('mascot-reaction')).toBeInTheDocument();
    expect(screen.getByTestId('board-cleared-card')).toBeInTheDocument();
  });

  it('has dialog role with correct aria-label', () => {
    render(<HighlightPlayer moments={[fakeMoment]} finalScore={500} onComplete={vi.fn()} />);
    expect(screen.getAllByRole('dialog', { name: /blast\.highlight\.reelLabel/ })).toHaveLength(1);
  });

  it('allows Escape key to skip', () => {
    const onComplete = vi.fn();
    render(<HighlightPlayer moments={[fakeMoment]} finalScore={500} onComplete={onComplete} />);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onComplete).toHaveBeenCalled();
  });

  it('allows Space key to skip', () => {
    const onComplete = vi.fn();
    render(<HighlightPlayer moments={[fakeMoment]} finalScore={500} onComplete={onComplete} />);
    fireEvent.keyDown(window, { key: ' ' });
    expect(onComplete).toHaveBeenCalled();
  });
});
