import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
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
  it('ends with the challenge link when one is given, so a friend lands on the same puzzle', () => {
    const url = 'https://lexiclash.live/en/daily?whName=Ohad&whScore=444&whPuzzle=251';
    const text = buildDailyShareText(251, 444, true, mockWords, t, url);
    expect(text.split('\n').pop()).toBe(url);
  });

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

describe('EmojiShareCard — share link', () => {
  it('native share carries the challenge link, not the bare homepage', async () => {
    const url = 'https://lexiclash.live/en/daily?whName=Ohad&whScore=444&whPuzzle=251';
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'share', { value: share, configurable: true });
    render(
      <EmojiShareCard puzzleNumber={251} score={444} solved words={mockWords} language="en" t={t} shareUrl={url} />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Share' }));
    await waitFor(() => expect(share).toHaveBeenCalled());
    expect(JSON.stringify(share.mock.calls[0][0])).toContain('whPuzzle=251');
    expect(JSON.stringify(share.mock.calls[0][0])).not.toContain('"url":"https://lexiclash.live"');
  });
});
