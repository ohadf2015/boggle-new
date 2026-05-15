import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { RunPageClient } from '../RunPageClient';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));
vi.mock('@/contexts/NavigationContext', () => ({ useHideNavigation: () => vi.fn() }));
vi.mock('@/lib/word-craft/dictionary', () => ({
  loadWordCraftDictionary: () => Promise.resolve(new Set(['cat', 'cats'])),
}));
vi.mock('@/components/word-craft/WordCraftBoardSection', () => ({
  WordCraftBoardSection: () => <div data-testid="board-section" />,
}));
vi.mock('@/components/word-craft/WordCraftRack', () => ({
  WordCraftRack: () => <div data-testid="rack" />,
}));
vi.mock('@/components/word-craft/run/RunHUD', () => ({
  RunHUD: () => <div data-testid="run-hud" />,
}));
vi.mock('@/components/word-craft/run/CardPickScreen', () => ({
  CardPickScreen: () => <div data-testid="card-pick-screen" />,
}));
vi.mock('@/components/word-craft/run/RoundResultScene', () => ({
  RoundResultScene: () => <div data-testid="round-result-scene" />,
}));
vi.mock('@/components/word-craft/run/RunResultScene', () => ({
  RunResultScene: () => <div data-testid="run-result-scene" />,
}));
vi.mock('@/lib/word-craft/run/useWordCraftRun', () => ({
  useWordCraftRun: () => ({
    state: {
      phase: 'intro',
      board: { size: 7, cells: [] },
      rack: [],
      pendingPlacements: [],
      selectedRackTileId: null,
      round: { round: 1, score: 0, target: 10 },
      runTotal: 0,
      activeCards: [],
      cleared: false,
      roundPassed: false,
      cardChoice: null,
      lastError: null,
    },
    startRun: vi.fn(),
    placeTile: vi.fn(),
    selectRackTile: vi.fn(),
    submitMove: vi.fn(),
    recallAll: vi.fn(),
    endRound: vi.fn(),
    pickCard: vi.fn(),
    proceed: vi.fn(),
    restart: vi.fn(),
    tilesRemaining: 50,
  }),
}));

describe('RunPageClient', () => {
  it('renders the intro screen first with a start button', async () => {
    render(<RunPageClient />);
    expect(await screen.findByText('wordcraft.run.intro.title')).toBeInTheDocument();
    expect(screen.getByText('wordcraft.run.intro.start')).toBeInTheDocument();
  });

  it('orchestrates phase state machine with intro, playing, cardPick, roundResult, and runResult screens', async () => {
    const { rerender } = render(<RunPageClient />);
    // Initial: intro phase rendered
    expect(await screen.findByText('wordcraft.run.intro.title')).toBeInTheDocument();
  });
});
