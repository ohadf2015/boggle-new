import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';

vi.mock('@/hooks/useMediaQuery', () => ({ useMediaQuery: () => false }));
vi.mock('../SurvivalClueBoxes', () => ({ SurvivalClueBoxes: () => <div data-testid="clues" /> }));
vi.mock('../SurvivalLiveRanks', () => ({ SurvivalLiveRanks: () => <div /> }));
vi.mock('../SurvivalLootPanel', () => ({ SurvivalLootPanel: () => <div /> }));
vi.mock('../SurvivalHeader', () => ({
  SurvivalHeader: ({ center }: { center?: React.ReactNode }) => <div data-testid="survival-header">{center}</div>,
}));
vi.mock('../SurvivalLifeBar', () => ({ SurvivalLifeBar: () => <div data-testid="life-bar" /> }));

import { SurvivalDesktopLayout } from '../SurvivalDesktopLayout';

describe('SurvivalDesktopLayout HUD', () => {
  it('Given the desktop game, when it renders, then the life bar rides in the header row once so the board gets the height', () => {
    render(
      <SurvivalDesktopLayout
        isTv={false}
        playfield={<div data-testid="playfield" />}
        isGameOver={false}
        lifePoints={100}
        isLifeGaining={false}
        lifeGainAmount={null}
        skipAnimations={false}
        onLifeGainComplete={() => {}}
        liveScore={0}
        lastScoreIncrement={null}
        isScoreAnimating={false}
        currentHint={null}
        targetWord="CRANE"
        attempts={[]}
        accumulatedClues={new Map()}
        revealedLetters={new Set()}
        knownLetters={new Set()}
        latestAttemptFeedback={null}
        showFeedbackOverlay={false}
        isClueGaining={false}
        clueContainerRef={{ current: null }}
        gameDir="ltr"
        discoveredWords={[]}
        hintStage={0}
        puzzleDate="2026-10-10"
        language="en"
        currentPlayerId={null}
        currentGuestFingerprint={null}
        onQuitClick={() => {}}
        t={(k: string) => k}
      />,
    );
    expect(screen.getAllByTestId('life-bar')).toHaveLength(1);
    expect(within(screen.getByTestId('survival-header')).getByTestId('life-bar')).toBeInTheDocument();
  });
});
