/**
 * BlastInsightRibbon — renders a single localized headline card from results.
 */
import { render, screen } from '@testing-library/react';
import { BlastInsightRibbon } from '../BlastInsightRibbon';
import type { BlastResultsData } from '../types';

// Minimal mock t() — substitutes {var} tokens
const mockT = (key: string, vars?: Record<string, string | number>): string => {
  const map: Record<string, string> = {
    'blast.insight.label': 'MOMENT OF THE RUN',
    'blast.insight.masterstroke': 'MASTERSTROKE — {length}-LETTER {word}',
    'blast.insight.cascadeKing': 'CASCADE KING — x{combo} CHAIN',
    'blast.insight.survivor': 'STILL STANDING — {pct}% CLEARED',
    'blast.insight.bullseye': 'BULLSEYE — YOU FOUND {word}',
    'blast.insight.newRecord': 'NEW RECORD — +{delta} POINTS',
  };
  let template = map[key] ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      template = template.replace(`{${k}}`, String(v));
    }
  }
  return template;
};

function makeResults(overrides: Partial<BlastResultsData> = {}): BlastResultsData {
  return {
    finalScore: 100,
    tilesCleared: 30,
    totalTiles: 36,
    clearPercentage: 95,
    wordsFound: ['cat', 'dog'],
    bestWord: 'CAT',
    maxCombo: 1,
    stars: 1,
    wavesCompleted: 1,
    waveResults: [],
    ...overrides,
  };
}

describe('BlastInsightRibbon', () => {
  it('renders the picked insight headline', () => {
    render(<BlastInsightRibbon results={makeResults({
      wordsFound: ['extreme', 'ELEPHANTS'], bestWord: 'ELEPHANTS', clearPercentage: 95,
    })} t={mockT} />);
    expect(screen.getByTestId('blast-insight-ribbon')).toHaveAttribute('data-insight-id', 'masterstroke');
    expect(screen.getByText(/MASTERSTROKE/)).toBeInTheDocument();
  });

  it('renders bullseye when target word found', () => {
    render(<BlastInsightRibbon results={makeResults({
      targetWord: 'CRYSTAL', targetWordFound: true, maxCombo: 5, clearPercentage: 95,
    })} t={mockT} />);
    expect(screen.getByTestId('blast-insight-ribbon')).toHaveAttribute('data-insight-id', 'bullseye');
    expect(screen.getByText(/CRYSTAL/)).toBeInTheDocument();
  });

  it('renders newRecord with delta substitution', () => {
    render(<BlastInsightRibbon results={makeResults({
      finalScore: 1500, previousBest: 1200, clearPercentage: 95,
    })} t={mockT} />);
    expect(screen.getByText(/\+300 POINTS/)).toBeInTheDocument();
  });

  it('renders cascadeKing tone=cyan', () => {
    render(<BlastInsightRibbon results={makeResults({
      maxCombo: 5, clearPercentage: 95,
    })} t={mockT} />);
    const ribbon = screen.getByTestId('blast-insight-ribbon');
    expect(ribbon).toHaveAttribute('data-insight-tone', 'cyan');
  });

  it('renders the section label', () => {
    render(<BlastInsightRibbon results={makeResults()} t={mockT} />);
    expect(screen.getByText('MOMENT OF THE RUN')).toBeInTheDocument();
  });

  it('falls back to survivor for ordinary clears', () => {
    render(<BlastInsightRibbon results={makeResults({
      clearPercentage: 96, wordsFound: ['cat'],
    })} t={mockT} />);
    expect(screen.getByTestId('blast-insight-ribbon'))
      .toHaveAttribute('data-insight-id', 'survivor');
  });
});
