import React from 'react';
import { render, screen } from '@testing-library/react';
import { EmojiShareCard, buildDailyShareText } from '../EmojiShareCard';

const t = (key: string) => {
  const map: Record<string, string> = {
    'daily.puzzleNumber': 'Word Hunt #{number}',
    'wordHunt.leaderboard.pts': 'pts',
    'share.words': 'words',
    'share.longest': 'Longest',
    'share.emojiCard.solved': 'cleared',
    'share.emojiCard.unsolved': 'open',
    'share.emojiCard.status': 'status',
    'share.emojiCard.share': 'Share',
    'share.emojiCard.copy': 'Copy',
    'share.emojiCard.hideWords': 'Hide words',
    'share.emojiCard.revealWords': 'Reveal words',
    'common.copied': 'Copied!',
  };
  return map[key] ?? key;
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

  it('never renders Wordle letter-squares or status emoji', () => {
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
    expect(card.textContent).not.toContain('✅');
    expect(card.textContent).not.toContain('❌');
    expect(card.textContent).not.toContain('⚡');
    expect(card).toHaveTextContent('LexiClash');
    expect(card).toHaveTextContent('cleared');
  });

  it('renders labeled stats and length bars', () => {
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
    expect(screen.getByTestId('share-letter-tiles')).toBeInTheDocument();
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

  it('renders open status when not solved', () => {
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
    expect(card).toHaveTextContent('open');
    expect(card.textContent).not.toContain('❌');
  });
});

describe('buildDailyShareText', () => {
  it('is a labeled LexiClash recap, not a Wordle grid', () => {
    const text = buildDailyShareText(251, 444, true, mockWords, t);
    expect(text).toContain('LexiClash');
    expect(text).toContain('251');
    expect(text).toContain('444');
    expect(text).toContain('3 words');
    expect(text).toContain('lexiclash.live');
    expect(text).not.toContain('🟩');
    expect(text).not.toContain('🟨');
    expect(text).not.toContain('⬛');
    expect(text).not.toContain('⬜');
    expect(text).not.toContain('✅');
    expect(text).not.toContain('❌');
    expect(text).not.toContain('CATCH');
  });
});
