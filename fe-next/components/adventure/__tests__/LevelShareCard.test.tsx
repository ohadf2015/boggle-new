import { vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LevelShareCard } from '../LevelShareCard';

const mockT = (key: string) => key;

const defaultProps = {
  worldNumber: 3,
  levelNumber: 5,
  worldName: 'Syntax Savanna',
  stars: 3,
  score: 1250,
  bestWord: 'AMAZING',
  wordsFound: 12,
  t: mockT,
};

describe('LevelShareCard', () => {
  it('renders with testid', () => {
    render(<LevelShareCard {...defaultProps} />);
    expect(screen.getByTestId('level-share-card')).toBeInTheDocument();
  });

  it('displays world and level info', () => {
    render(<LevelShareCard {...defaultProps} />);
    expect(screen.getByText(/W3/)).toBeInTheDocument();
    expect(screen.getByText(/L5/)).toBeInTheDocument();
  });

  it('displays 3 filled stars', () => {
    render(<LevelShareCard {...defaultProps} />);
    const starContainer = screen.getByLabelText('3 of 3 stars');
    expect(starContainer).toBeInTheDocument();
  });

  it('displays score', () => {
    render(<LevelShareCard {...defaultProps} />);
    expect(screen.getByText('1,250')).toBeInTheDocument();
  });

  it('displays best word', () => {
    render(<LevelShareCard {...defaultProps} />);
    expect(screen.getByText('AMAZING')).toBeInTheDocument();
  });

  it('displays words found count', () => {
    render(<LevelShareCard {...defaultProps} />);
    expect(screen.getByText(/12/)).toBeInTheDocument();
  });

  it('has share and copy buttons', () => {
    render(<LevelShareCard {...defaultProps} />);
    expect(screen.getByText('share.emojiCard.share')).toBeInTheDocument();
    expect(screen.getByText('share.emojiCard.copy')).toBeInTheDocument();
  });

  it('copies share text to clipboard on copy click', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText }, writable: true, configurable: true,
    });

    render(<LevelShareCard {...defaultProps} />);
    fireEvent.click(screen.getByText('share.emojiCard.copy'));

    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('AMAZING'));
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('W3-L5'));
  });

  it('share text includes lexiclash.live', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText }, writable: true, configurable: true,
    });

    render(<LevelShareCard {...defaultProps} />);
    fireEvent.click(screen.getByText('share.emojiCard.copy'));

    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('lexiclash.live'));
  });
});
