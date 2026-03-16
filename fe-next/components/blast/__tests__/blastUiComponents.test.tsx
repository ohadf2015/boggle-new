import React from 'react';
import { render, screen, act } from '@testing-library/react';
import type { BlastTileState, BlastResultsData } from '../types';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...rest }: any) => <div {...rest}>{children}</div>,
    span: ({ children, ...rest }: any) => <span {...rest}>{children}</span>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

jest.mock('../hooks/useBlastResultSaver', () => ({
  useBlastResultSaver: () => ({ saved: false, personalBests: null, isNewBestScore: false, isNewBestCombo: false, error: null }),
}));

jest.mock('canvas-confetti', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en' }),
}));

jest.mock('@/components/ui/alert-dialog', () => ({
  AlertDialog: ({ children, open }: any) => open ? <div data-testid="dialog">{children}</div> : null,
  AlertDialogContent: ({ children }: any) => <div>{children}</div>,
  AlertDialogHeader: ({ children }: any) => <div>{children}</div>,
  AlertDialogTitle: ({ children }: any) => <h2>{children}</h2>,
  AlertDialogDescription: ({ children }: any) => <div>{children}</div>,
  AlertDialogFooter: ({ children }: any) => <div>{children}</div>,
  AlertDialogAction: ({ children, ...rest }: any) => <button {...rest}>{children}</button>,
}));

jest.mock('lucide-react', () => ({
  Gem: () => <span data-testid="gem-icon" />,
  Bomb: () => <span data-testid="bomb-icon" />,
  Rainbow: () => <span data-testid="rainbow-icon" />,
  Hand: () => <span data-testid="hand-icon" />,
  Star: () => <span data-testid="star-icon" />,
  Diamond: () => <span data-testid="diamond-icon" />,
  Snowflake: () => <span data-testid="snowflake-icon" />,
  Sparkles: () => <span data-testid="sparkles-icon" />,
  Shuffle: () => <span data-testid="shuffle-icon" />,
  Magnet: () => <span data-testid="magnet-icon" />,
  Zap: () => <span data-testid="zap-icon" />,
  CircleDollarSign: () => <span data-testid="circle-dollar-sign-icon" />,
  RotateCcw: () => <span />,
  Home: () => <span />,
  Trophy: () => <span />,
  Grid3X3: () => <span />,
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, ...rest }: any) => <button {...rest}>{children}</button>,
}));

jest.mock('@/lib/utils', () => ({
  cn: (...args: any[]) => args.filter(Boolean).join(' '),
}));

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import { BlastProgressBar } from '../BlastProgressBar';
import { BlastFoundWords } from '../BlastFoundWords';
import { BlastResults } from '../BlastResults';
import { BlastTileOverlay } from '../BlastTileOverlay';
import { BlastHelpModal } from '../BlastHelpModal';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const t = (key: string) => key;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('BlastProgressBar', () => {
  it('renders cleared/total text', () => {
    render(<BlastProgressBar cleared={5} total={36} t={t} />);
    expect(screen.getByText('5/36')).toBeInTheDocument();
  });

  it('renders percentage when cleared > 0', () => {
    render(<BlastProgressBar cleared={18} total={36} t={t} />);
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('does not render percentage badge when cleared is 0', () => {
    render(<BlastProgressBar cleared={0} total={36} t={t} />);
    expect(screen.queryByText('0%')).not.toBeInTheDocument();
    expect(screen.getByText('0/36')).toBeInTheDocument();
  });

  it('renders the progress label from t()', () => {
    render(<BlastProgressBar cleared={1} total={10} t={t} />);
    expect(screen.getByText('blast.progress')).toBeInTheDocument();
  });
});

describe('BlastFoundWords', () => {
  it('renders each word', () => {
    render(<BlastFoundWords words={['CAT', 'DOG', 'FISH']} t={t} />);
    expect(screen.getByText('CAT')).toBeInTheDocument();
    expect(screen.getByText('DOG')).toBeInTheDocument();
    expect(screen.getByText('FISH')).toBeInTheDocument();
  });

  it('renders found words label', () => {
    render(<BlastFoundWords words={['HI']} t={t} />);
    expect(screen.getByText('blast.foundWords')).toBeInTheDocument();
  });

  it('renders no word elements for empty array', () => {
    const { container } = render(<BlastFoundWords words={[]} t={t} />);
    const wordSpans = container.querySelectorAll('span.px-2\\.5');
    expect(wordSpans).toHaveLength(0);
  });
});

describe('BlastResults', () => {
  const resultsData: BlastResultsData = {
    finalScore: 150,
    tilesCleared: 20,
    totalTiles: 36,
    clearPercentage: 55.6,
    wordsFound: ['CAT', 'DOG'],
    bestWord: 'DOG',
    maxCombo: 3,
    stars: 2,
    wavesCompleted: 0,
    waveResults: [],
  };

  const onPlayAgain = jest.fn();
  const onBackToHome = jest.fn();

  it('renders the final score (via animated count-up display)', () => {
    // Score animates from 0 → finalScore; use requestAnimationFrame mock to advance to final
    const rafCalls: FrameRequestCallback[] = [];
    const originalRAF = global.requestAnimationFrame;
    global.requestAnimationFrame = (cb: FrameRequestCallback) => {
      rafCalls.push(cb);
      return 0;
    };

    const { unmount } = render(
      <BlastResults results={resultsData} onPlayAgain={onPlayAgain} onBackToHome={onBackToHome} />,
    );

    // Simulate animation completing: advance time past duration and flush RAF
    const now = Date.now();
    jest.spyOn(Date, 'now').mockReturnValue(now + 2000); // past 1500ms duration
    act(() => {
      rafCalls.forEach(cb => cb(now + 2000));
    });

    expect(screen.getByTestId('blast-score-display')).toHaveTextContent('150');

    global.requestAnimationFrame = originalRAF;
    jest.restoreAllMocks();
    unmount();
  });

  it('renders the clear percentage', () => {
    render(
      <BlastResults results={resultsData} onPlayAgain={onPlayAgain} onBackToHome={onBackToHome} />,
    );
    expect(screen.getByText('55.6% (20/36)')).toBeInTheDocument();
  });

  it('renders play again button', () => {
    render(
      <BlastResults results={resultsData} onPlayAgain={onPlayAgain} onBackToHome={onBackToHome} />,
    );
    expect(screen.getByText('common.playAgain')).toBeInTheDocument();
  });

  it('renders home button', () => {
    render(
      <BlastResults results={resultsData} onPlayAgain={onPlayAgain} onBackToHome={onBackToHome} />,
    );
    expect(screen.getByText('common.home')).toBeInTheDocument();
  });

  it('renders star rating icons', () => {
    render(
      <BlastResults results={resultsData} onPlayAgain={onPlayAgain} onBackToHome={onBackToHome} />,
    );
    const stars = screen.getAllByTestId('star-icon');
    expect(stars.length).toBeGreaterThanOrEqual(3);
  });
});

describe('BlastTileOverlay', () => {
  const makeTile = (
    row: number,
    col: number,
    type: BlastTileState['type'] = 'standard',
    isCleared = false,
  ): BlastTileState => ({
    row,
    col,
    type,
    isCleared,
    activationEffect: null,
    hitsRemaining: type === 'ice' ? 2 : 0,
  });

  it('renders nothing for standard uncleared tiles', () => {
    const tileStates: BlastTileState[][] = [
      [makeTile(0, 0, 'standard'), makeTile(0, 1, 'standard')],
      [makeTile(1, 0, 'standard'), makeTile(1, 1, 'standard')],
    ];
    const { container } = render(
      <BlastTileOverlay tileStates={tileStates} gridSize={2} />,
    );
    // Only the wrapper grid div exists, no overlay children rendered
    const overlayChildren = container.querySelector('[data-testid="blast-tile-overlay"]')?.children;
    expect(overlayChildren?.length).toBe(0);
  });

  it('renders a gap div for cleared tiles', () => {
    const tileStates: BlastTileState[][] = [
      [makeTile(0, 0, 'standard', true), makeTile(0, 1, 'standard')],
    ];
    const { container } = render(
      <BlastTileOverlay tileStates={tileStates} gridSize={2} />,
    );
    const gapDivs = container.querySelectorAll('.rounded-lg');
    expect(gapDivs.length).toBe(1);
  });

  it('renders an overlay div for gold tiles', () => {
    const tileStates: BlastTileState[][] = [
      [makeTile(0, 0, 'gold'), makeTile(0, 1, 'standard')],
    ];
    const { container } = render(
      <BlastTileOverlay tileStates={tileStates} gridSize={2} />,
    );
    const goldDivs = container.querySelectorAll('.blast-tile-gold');
    expect(goldDivs.length).toBe(1);
  });

  it('renders an overlay div for bomb tiles', () => {
    const tileStates: BlastTileState[][] = [
      [makeTile(0, 0, 'bomb')],
    ];
    const { container } = render(
      <BlastTileOverlay tileStates={tileStates} gridSize={1} />,
    );
    const bombDivs = container.querySelectorAll('.blast-tile-bomb');
    expect(bombDivs.length).toBe(1);
  });

  it('uses CSS Grid layout with correct gridRow/gridColumn', () => {
    const tileStates: BlastTileState[][] = [
      [makeTile(0, 0, 'gold'), makeTile(0, 1, 'standard')],
      [makeTile(1, 0, 'standard'), makeTile(1, 1, 'bomb')],
    ];
    const { container } = render(
      <BlastTileOverlay tileStates={tileStates} gridSize={2} />,
    );
    const goldDiv = container.querySelector('.blast-tile-gold') as HTMLElement;
    const bombDiv = container.querySelector('.blast-tile-bomb') as HTMLElement;
    // CSS Grid placement: 1-indexed (row + 1, col + 1)
    expect(goldDiv.style.gridRow).toBe('1');
    expect(goldDiv.style.gridColumn).toBe('1');
    expect(bombDiv.style.gridRow).toBe('2');
    expect(bombDiv.style.gridColumn).toBe('2');
  });

  it('renders effect badge with icon and label for gold tile', () => {
    const tileStates: BlastTileState[][] = [
      [makeTile(0, 0, 'gold')],
    ];
    render(<BlastTileOverlay tileStates={tileStates} gridSize={1} />);
    expect(screen.getByTestId('star-icon')).toBeInTheDocument();
    expect(screen.getByTestId('badge-gold')).toHaveTextContent('3×');
  });

  it('renders effect badge with icon and label for bomb tile', () => {
    const tileStates: BlastTileState[][] = [
      [makeTile(0, 0, 'bomb')],
    ];
    render(<BlastTileOverlay tileStates={tileStates} gridSize={1} />);
    expect(screen.getByTestId('bomb-icon')).toBeInTheDocument();
    expect(screen.getByTestId('badge-bomb')).toHaveTextContent('8');
  });

  it('renders effect badge with icon and label for rainbow tile', () => {
    const tileStates: BlastTileState[][] = [
      [makeTile(0, 0, 'rainbow')],
    ];
    render(<BlastTileOverlay tileStates={tileStates} gridSize={1} />);
    expect(screen.getByTestId('rainbow-icon')).toBeInTheDocument();
    expect(screen.getByTestId('badge-rainbow')).toHaveTextContent('+5');
  });

  it('renders effect badge with icon and label for ice tile', () => {
    const tileStates: BlastTileState[][] = [
      [makeTile(0, 0, 'ice')],
    ];
    render(<BlastTileOverlay tileStates={tileStates} gridSize={1} />);
    expect(screen.getByTestId('snowflake-icon')).toBeInTheDocument();
    expect(screen.getByTestId('badge-ice')).toHaveTextContent('×2');
  });

  it('sets dir="ltr" on overlay to match GridComponent', () => {
    const tileStates: BlastTileState[][] = [
      [makeTile(0, 0, 'gold')],
    ];
    render(<BlastTileOverlay tileStates={tileStates} gridSize={1} />);
    const overlay = screen.getByTestId('blast-tile-overlay');
    expect(overlay.getAttribute('dir')).toBe('ltr');
  });

  it('applies selection glow class when tile is in selectedPositions', () => {
    const tileStates: BlastTileState[][] = [
      [makeTile(0, 0, 'gold'), makeTile(0, 1, 'bomb')],
    ];
    const selectedPositions = new Set(['0-0']);
    const { container } = render(
      <BlastTileOverlay tileStates={tileStates} gridSize={2} selectedPositions={selectedPositions} />,
    );
    const goldDiv = container.querySelector('.blast-tile-gold') as HTMLElement;
    const bombDiv = container.querySelector('.blast-tile-bomb') as HTMLElement;
    expect(goldDiv.className).toContain('blast-tile-selected');
    expect(bombDiv.className).not.toContain('blast-tile-selected');
  });

  it('does not apply selection glow when selectedPositions is empty', () => {
    const tileStates: BlastTileState[][] = [
      [makeTile(0, 0, 'gold')],
    ];
    const { container } = render(
      <BlastTileOverlay tileStates={tileStates} gridSize={1} />,
    );
    const goldDiv = container.querySelector('.blast-tile-gold') as HTMLElement;
    expect(goldDiv.className).not.toContain('blast-tile-selected');
  });

  it('applies objective highlight class to tiles matching objectiveTileTypes', () => {
    const tileStates: BlastTileState[][] = [
      [makeTile(0, 0, 'bomb'), makeTile(0, 1, 'gold')],
    ];
    const { container } = render(
      <BlastTileOverlay tileStates={tileStates} gridSize={2} objectiveTileTypes={new Set(['bomb'])} />,
    );
    const bombDiv = container.querySelector('.blast-tile-bomb') as HTMLElement;
    const goldDiv = container.querySelector('.blast-tile-gold') as HTMLElement;
    expect(bombDiv.className).toContain('blast-tile-objective');
    expect(goldDiv.className).not.toContain('blast-tile-objective');
  });

  it('does not apply objective highlight when objectiveTileTypes is empty', () => {
    const tileStates: BlastTileState[][] = [
      [makeTile(0, 0, 'bomb')],
    ];
    const { container } = render(
      <BlastTileOverlay tileStates={tileStates} gridSize={1} objectiveTileTypes={new Set()} />,
    );
    const bombDiv = container.querySelector('.blast-tile-bomb') as HTMLElement;
    expect(bombDiv.className).not.toContain('blast-tile-objective');
  });
});

describe('BlastHelpModal', () => {
  const onOpenChange = jest.fn();

  it('renders nothing when closed', () => {
    render(<BlastHelpModal open={false} onOpenChange={onOpenChange} t={t} />);
    expect(screen.queryByTestId('dialog')).not.toBeInTheDocument();
  });

  it('renders title when open', () => {
    render(<BlastHelpModal open={true} onOpenChange={onOpenChange} t={t} />);
    expect(screen.getByTestId('dialog')).toBeInTheDocument();
    expect(screen.getByText('blast.helpTitle')).toBeInTheDocument();
  });

  it('shows tile explanations when open', () => {
    render(<BlastHelpModal open={true} onOpenChange={onOpenChange} t={t} />);
    expect(screen.getByTestId('gem-icon')).toBeInTheDocument();
    expect(screen.getByTestId('bomb-icon')).toBeInTheDocument();
    expect(screen.getByTestId('rainbow-icon')).toBeInTheDocument();
    expect(screen.getByTestId('hand-icon')).toBeInTheDocument();
  });

  it('shows ice tile explanation when open', () => {
    render(<BlastHelpModal open={true} onOpenChange={onOpenChange} t={t} />);
    expect(screen.getByText('blast.helpIceLabel')).toBeInTheDocument();
    expect(screen.getByText('blast.helpIce')).toBeInTheDocument();
  });

  it('shows lightning tile explanation when open', () => {
    render(<BlastHelpModal open={true} onOpenChange={onOpenChange} t={t} />);
    expect(screen.getByText('blast.helpLightningLabel')).toBeInTheDocument();
    expect(screen.getByText('blast.helpLightning')).toBeInTheDocument();
  });

  it('shows magnet tile explanation when open', () => {
    render(<BlastHelpModal open={true} onOpenChange={onOpenChange} t={t} />);
    expect(screen.getByText('blast.helpMagnetLabel')).toBeInTheDocument();
    expect(screen.getByText('blast.helpMagnet')).toBeInTheDocument();
  });

  it('shows mirror tile explanation when open', () => {
    render(<BlastHelpModal open={true} onOpenChange={onOpenChange} t={t} />);
    expect(screen.getByText('blast.helpMirrorLabel')).toBeInTheDocument();
    expect(screen.getByText('blast.helpMirror')).toBeInTheDocument();
  });

  it('shows silver tile explanation when open', () => {
    render(<BlastHelpModal open={true} onOpenChange={onOpenChange} t={t} />);
    expect(screen.getByText('blast.helpSilverLabel')).toBeInTheDocument();
    expect(screen.getByText('blast.helpSilver')).toBeInTheDocument();
  });

  it('shows diamond tile explanation when open', () => {
    render(<BlastHelpModal open={true} onOpenChange={onOpenChange} t={t} />);
    expect(screen.getByText('blast.helpDiamondLabel')).toBeInTheDocument();
    expect(screen.getByText('blast.helpDiamond')).toBeInTheDocument();
  });

  it('renders got-it button when open', () => {
    render(<BlastHelpModal open={true} onOpenChange={onOpenChange} t={t} />);
    expect(screen.getByText('common.gotIt')).toBeInTheDocument();
  });
});
