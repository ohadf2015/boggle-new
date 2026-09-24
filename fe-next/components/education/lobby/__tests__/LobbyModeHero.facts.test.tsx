/**
 * Launch round 3: every mode card carries its facts — length, and then the
 * quiz's question count + pace, or a board game's grid + minimum word length —
 * so a teacher picks in two seconds. Read from the lobby's own settings.
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en' }),
}));

import { LobbyModeHero } from '../LobbyModeHero';

const base: React.ComponentProps<typeof LobbyModeHero> = {
  selected: 'vocab-quiz',
  recommended: null,
  blockedKey: null,
  expanded: false,
  onToggleExpanded: vi.fn(),
  onPick: vi.fn(),
  onGoLive: vi.fn(),
};

describe('LobbyModeHero — fact chips on every card', () => {
  it('Given lobby settings, Then the quiz card shows questions + pace and a board card shows grid + letters', () => {
    render(
      <LobbyModeHero
        {...base}
        roundFacts={{ vocabQuizQuestionCount: 12, vocabQuizSeconds: 15, boardSize: 'large', minWordLength: 4 }}
      />
    );
    const quiz = screen.getByTestId('mode-tile-vocab-quiz');
    expect(quiz.querySelector('[data-testid="mode-fact-questions"]')).toHaveTextContent('12');
    expect(quiz.querySelector('[data-testid="mode-fact-pace"]')).toHaveTextContent('15');
    const classic = screen.getByTestId('mode-tile-classic');
    expect(classic.querySelector('[data-testid="mode-fact-board"]')).toHaveTextContent('7×7');
    expect(classic.querySelector('[data-testid="mode-fact-letters"]')).toHaveTextContent('4');
    expect(classic.querySelector('[data-testid="mode-fact-questions"]')).toBeNull();
  });

  it('Given no settings, Then the cards keep just their minute chip', () => {
    render(<LobbyModeHero {...base} />);
    expect(screen.queryAllByTestId(/^mode-fact-/)).toHaveLength(0);
  });
});
