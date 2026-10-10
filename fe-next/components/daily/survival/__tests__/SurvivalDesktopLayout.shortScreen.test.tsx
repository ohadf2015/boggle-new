import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

const media = vi.hoisted(() => ({ short: false }));
const clueProps = vi.hoisted(() => ({ last: null as Record<string, unknown> | null }));

vi.mock('@/hooks/useMediaQuery', () => ({ useMediaQuery: () => media.short }));
vi.mock('../SurvivalClueBoxes', () => ({
  SurvivalClueBoxes: (props: Record<string, unknown>) => {
    clueProps.last = props;
    return <div data-testid="clues" />;
  },
}));
vi.mock('../SurvivalLiveRanks', () => ({ SurvivalLiveRanks: () => <div /> }));
vi.mock('../SurvivalLootPanel', () => ({ SurvivalLootPanel: () => <div /> }));
vi.mock('../SurvivalHeader', () => ({ SurvivalHeader: () => <div /> }));
vi.mock('../SurvivalLifeBar', () => ({ SurvivalLifeBar: () => <div /> }));

import { SurvivalDesktopLayout } from '../SurvivalDesktopLayout';

function layout() {
  return render(
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
}

describe('SurvivalDesktopLayout on short screens', () => {
  beforeEach(() => {
    clueProps.last = null;
  });

  it('keeps full-size clue boxes on a tall desktop', () => {
    media.short = false;
    layout();
    expect(clueProps.last?.compact).toBeFalsy();
    expect(screen.getByTestId('desktop-playfield').dataset.short).toBe('false');
  });

  it('shrinks the clue boxes on a short laptop screen so the board keeps its size', () => {
    media.short = true;
    layout();
    expect(clueProps.last?.compact).toBe(true);
    expect(screen.getByTestId('desktop-playfield').dataset.short).toBe('true');
  });
});
