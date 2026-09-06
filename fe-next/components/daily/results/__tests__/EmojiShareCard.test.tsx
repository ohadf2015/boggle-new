import React from 'react';
import { render, screen } from '@testing-library/react';
import { EmojiShareCard, buildDailyShareText } from '../EmojiShareCard';

const t = (key: string) => {
  if (key === 'daily.puzzleNumber') return 'Word Hunt #{number}';
  if (key === 'wordHunt.leaderboard.pts') return 'pts';
  if (key === 'share.words') return 'words';
  if (key === 'share.longest') return 'Longest:';
  return key;
};

const mockWords = [
  { word: 'CATCH', found: true },
  { word: 'LIGHT', found: true },
  { word: 'AT', found: true },
  { word: 'STONE', found: false },
];

describe('EmojiShareCard', () => {
  it('renders puzzle number and score', () => {
    render(
      <EmojiShareCard
        puzzleNumber={421}
        score={847}
        solved={true}
        words={mockWords}
        language="en"
        t={t}
      />
    );
    expect(screen.getByText(/421/)).toBeInTheDocument();
    expect(screen.getByText(/847/)).toBeInTheDocument();
  });

  it('never renders Wordle letter-squares', () => {
    render(
      <EmojiShareCard
        puzzleNumber={421}
        score={847}
        solved={true}
        words={mockWords}
        language="en"
        t={t}
      />
    );
    const card = screen.getByTestId('emoji-share-card');
    expect(card.textContent).not.toContain('🟩');
    expect(card.textContent).not.toContain('🟨');
    expect(card.textContent).not.toContain('⬛');
    expect(card.textContent).not.toContain('⬜');
    expect(card).toHaveTextContent('LEXICLASH');
  });

  it('renders length bars instead of a letter grid', () => {
    render(
      <EmojiShareCard
        puzzleNumber={421}
        score={847}
        solved={true}
        words={mockWords}
        language="en"
        t={t}
      />
    );
    expect(screen.getByTestId('lexiclash-length-bars')).toBeInTheDocument();
    expect(screen.getByTestId('emoji-share-card')).toHaveTextContent('words');
  });

  it('shows domain lexiclash.live', () => {
    render(
      <EmojiShareCard
        puzzleNumber={421}
        score={847}
        solved={true}
        words={mockWords}
        language="en"
        t={t}
      />
    );
    expect(screen.getByText(/lexiclash\.live/)).toBeInTheDocument();
  });

  it('renders ❌ when not solved', () => {
    render(
      <EmojiShareCard
        puzzleNumber={421}
        score={0}
        solved={false}
        words={[{ word: 'CATCH', found: false }]}
        language="en"
        t={t}
      />
    );
    const card = screen.getByTestId('emoji-share-card');
    expect(card).toHaveTextContent('❌');
  });
});

describe('buildDailyShareText', () => {
  it('is a LexiClash recap, not a Wordle grid', () => {
    const text = buildDailyShareText(251, 444, true, mockWords, t);
    expect(text).toContain('LEXICLASH');
    expect(text).toContain('251');
    expect(text).toContain('444');
    expect(text).toContain('3 words');
    expect(text).toContain('lexiclash.live');
    expect(text).not.toContain('🟩');
    expect(text).not.toContain('🟨');
    expect(text).not.toContain('⬛');
    expect(text).not.toContain('⬜');
    expect(text).not.toContain('CATCH');
  });
});
