/**
 * `mpChrome`: the live MP round owns the HUD (exit, timer, score, rank) and the
 * roster, and the "any word heals" rule moved to the countdown. The phone word
 * hunt keeps ONE compact mode strip (tries + letter slots) + the life bar, and
 * the board takes the rest. Default (no prop) renders exactly as before.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { WordHuntGameLayout } from '../WordHuntGameLayout';

const clueProps: Array<Record<string, unknown>> = [];
vi.mock('../WordHuntMPHeader', () => ({ WordHuntMPHeader: () => <div data-testid="mp-header" /> }));
vi.mock('../WordHuntMPLeaderboard', () => ({ WordHuntMPLeaderboard: () => <div data-testid="mp-leaderboard" /> }));
vi.mock('../WordHuntGameOverOverlay', () => ({ WordHuntGameOverOverlay: () => null }));
vi.mock('@/components/daily/survival/SurvivalLifeBar', () => ({ SurvivalLifeBar: () => <div data-testid="life-bar" /> }));
vi.mock('@/components/daily/survival/SurvivalGridSection', () => ({ SurvivalGridSection: () => <div data-testid="grid-section" /> }));
vi.mock('@/components/daily/survival/SurvivalClueBoxes', () => ({
  SurvivalClueBoxes: (p: Record<string, unknown>) => {
    clueProps.push(p);
    return <div data-testid="real-clue-boxes" />;
  },
}));

const baseProps = {
  score: 0,
  onQuit: () => {},
  targetLength: 5,
  currentHint: { hint: '_ _ _ _ _', level: 0, unlockCost: 0 },
  attempts: [],
  accumulatedClues: new Map(),
  knownLetters: new Set<string>(),
  latestAttemptFeedback: null,
  showFeedbackOverlay: false,
  lifePoints: 100,
  isGameOver: false,
  targetFound: false,
  isLifeGaining: false,
  lifeGainAmount: null,
  isClueGaining: false,
  grid: [['A']] as never,
  onWordSubmit: () => {},
  onWordChange: () => {},
  playerLives: {},
  eliminatedPlayers: [],
  leaderboard: [{ username: 'me', score: 0 }, { username: 'bot', score: 5 }],
  currentUsername: 'me',
  t: (k: string) => k,
  gameDir: 'ltr' as const,
};

describe('WordHuntGameLayout mpChrome', () => {
  beforeEach(() => { clueProps.length = 0; });

  it('drops the header, the heal line and both opponent leaderboards', () => {
    render(<WordHuntGameLayout {...baseProps} mpChrome />);
    expect(screen.queryByTestId('mp-header')).toBeNull();
    expect(screen.queryByTestId('wh-heal-hint')).toBeNull();
    expect(screen.queryByTestId('mp-leaderboard')).toBeNull();
    expect(screen.getByTestId('real-clue-boxes')).toBeInTheDocument();
    expect(screen.getByTestId('life-bar')).toBeInTheDocument();
    expect(screen.getByTestId('grid-section')).toBeInTheDocument();
  });

  it('runs the clue strip compact so the board keeps the room', () => {
    render(<WordHuntGameLayout {...baseProps} mpChrome />);
    expect(clueProps.at(-1)?.compact).toBe(true);
  });

  it('anchors the board low (thumb zone), same as classic — the gap above is the callout stage', () => {
    render(<WordHuntGameLayout {...baseProps} mpChrome />);
    const slot = screen.getByTestId('grid-section').parentElement!.parentElement!;
    expect(slot.className).toContain('items-end');
    expect(slot.className).not.toContain('items-center');
  });

  it('never splits into its own sidebar row (the round frame owns desktop)', () => {
    const { container } = render(<WordHuntGameLayout {...baseProps} mpChrome />);
    expect((container.firstChild as HTMLElement).className).not.toContain('min-[720px]:flex-row');
  });

  it('default render is unchanged: header, heal hint and leaderboards present', () => {
    render(<WordHuntGameLayout {...baseProps} />);
    expect(screen.getByTestId('mp-header')).toBeInTheDocument();
    expect(screen.getByTestId('wh-heal-hint')).toBeInTheDocument();
    expect(screen.getAllByTestId('mp-leaderboard')).toHaveLength(2);
  });
});
