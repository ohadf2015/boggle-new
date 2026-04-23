// @vitest-environment jsdom
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { GameEmojiShareCard } from '../GameEmojiShareCard';

const t = (key: string) => {
  const map: Record<string, string> = {
    'share.emojiCard.classicHeader': 'LexiClash Daily #{number}',
    'share.emojiCard.blastHeader': 'LexiClash Blast 💥',
    'share.emojiCard.share': 'Share',
    'share.emojiCard.copy': 'Copy',
    'common.pts': 'pts',
    'common.copied': 'Copied!',
    'blast.cleared': 'Cleared',
  };
  return map[key] ?? key;
};

describe('GameEmojiShareCard — classic mode', () => {
  const classicData = {
    mode: 'classic' as const,
    puzzleNumber: 42,
    score: 350,
    words: ['CAT', 'STONE', 'LIGHT'],
  };

  it('renders puzzle number in header', () => {
    render(<GameEmojiShareCard data={classicData} t={t} />);
    expect(screen.getByTestId('game-emoji-share-card')).toHaveTextContent('42');
  });

  it('renders score and pts', () => {
    render(<GameEmojiShareCard data={classicData} t={t} />);
    expect(screen.getByTestId('game-emoji-share-card')).toHaveTextContent('350');
    expect(screen.getByTestId('game-emoji-share-card')).toHaveTextContent('pts');
  });

  it('renders green squares for each found word', () => {
    render(<GameEmojiShareCard data={classicData} t={t} />);
    const card = screen.getByTestId('game-emoji-share-card');
    // CAT = 3 letters → 🟩🟩🟩
    expect(card).toHaveTextContent('🟩🟩🟩');
    // STONE = 5 letters → 🟩🟩🟩🟩🟩
    expect(card).toHaveTextContent('🟩🟩🟩🟩🟩');
  });

  it('shows Share and Copy buttons', () => {
    render(<GameEmojiShareCard data={classicData} t={t} />);
    expect(screen.getByText('Share')).toBeInTheDocument();
    expect(screen.getByText('Copy')).toBeInTheDocument();
  });

  it('shows domain', () => {
    render(<GameEmojiShareCard data={classicData} t={t} />);
    expect(screen.getByTestId('game-emoji-share-card')).toHaveTextContent('lexiclash.live');
  });

  it('shows Copied! feedback after copy click', async () => {
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
    render(<GameEmojiShareCard data={classicData} t={t} />);
    fireEvent.click(screen.getByText('Copy'));
    expect(await screen.findByText('Copied!')).toBeInTheDocument();
  });
});

describe('GameEmojiShareCard — blast mode', () => {
  const blastData = {
    mode: 'blast' as const,
    score: 1200,
    stars: 3 as const,
    clearPercentage: 95,
    wordsFound: ['CAT', 'DOG'],
    maxCombo: 5,
    wavesCompleted: 2,
    waveResults: [
      { waveNumber: 1, clearPercentage: 100 },
      { waveNumber: 2, clearPercentage: 90 },
    ],
  };

  it('renders blast header', () => {
    render(<GameEmojiShareCard data={blastData} t={t} />);
    expect(screen.getByTestId('game-emoji-share-card')).toHaveTextContent('LexiClash Blast 💥');
  });

  it('renders score and clear percentage', () => {
    render(<GameEmojiShareCard data={blastData} t={t} />);
    const card = screen.getByTestId('game-emoji-share-card');
    expect(card).toHaveTextContent('1,200');
    expect(card).toHaveTextContent('95%');
    expect(card).toHaveTextContent('Cleared');
  });

  it('renders star rows for completed waves', () => {
    render(<GameEmojiShareCard data={blastData} t={t} />);
    const card = screen.getByTestId('game-emoji-share-card');
    // Wave 1 at 100% → ⭐⭐⭐
    expect(card).toHaveTextContent('⭐⭐⭐');
  });

  it('renders combo row when maxCombo >= 3', () => {
    render(<GameEmojiShareCard data={blastData} t={t} />);
    const card = screen.getByTestId('game-emoji-share-card');
    expect(card).toHaveTextContent('5x combo');
  });

  it('does not render combo row when maxCombo < 3', () => {
    const data = { ...blastData, maxCombo: 2 };
    render(<GameEmojiShareCard data={data} t={t} />);
    expect(screen.getByTestId('game-emoji-share-card')).not.toHaveTextContent('combo');
  });
});

describe('GameEmojiShareCard — onShareClick telemetry hook', () => {
  const data = {
    mode: 'classic' as const,
    puzzleNumber: 1,
    score: 100,
    words: ['CAT'],
  };

  it('invokes onShareClick with "copy" when Copy pressed', () => {
    const onShareClick = vi.fn();
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
    render(<GameEmojiShareCard data={data} t={t} onShareClick={onShareClick} />);
    fireEvent.click(screen.getByText('Copy'));
    expect(onShareClick).toHaveBeenCalledWith('copy');
  });

  it('invokes onShareClick with "native" when Share pressed and navigator.share exists', () => {
    const onShareClick = vi.fn();
    Object.assign(navigator, {
      share: vi.fn().mockResolvedValue(undefined),
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
    render(<GameEmojiShareCard data={data} t={t} onShareClick={onShareClick} />);
    fireEvent.click(screen.getByText('Share'));
    expect(onShareClick).toHaveBeenCalledWith('native');
  });
});
