import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import WordWheelWordLine from '../WordWheelWordLine';

const base = {
  t: (key: string) => key,
  centerLetter: 'C',
  allLetters: ['C', 'A', 'T', 'S', 'R', 'E', 'N'],
  dir: 'ltr' as const,
  onRemove: vi.fn(),
  onSubmit: vi.fn(),
  isValidating: false,
  shake: false,
  feedback: null,
  acceptedWord: null,
  acceptedId: 0,
};

describe('WordWheelWordLine — finger down', () => {
  it('given a finger on a letter before any word, then the line already shows that letter instead of the hint', () => {
    render(<WordWheelWordLine {...base} hint letters={[]} pending="T" />);
    expect(screen.getByTestId('word-pending-letter').textContent).toBe('T');
    expect(screen.queryByText('wordWheel.tapLetters')).toBeNull();
    expect(screen.queryAllByTestId('built-letter-tile')).toHaveLength(0);
  });

  it('given a word under way, then the pressed letter trails the built tiles', () => {
    render(<WordWheelWordLine {...base} letters={[{ letter: 'C', wheelIndex: -1 }]} pending="A" />);
    expect(screen.getAllByTestId('built-letter-tile')).toHaveLength(1);
    expect(screen.getByTestId('word-pending-letter').textContent).toBe('A');
  });

  it('given no finger down, then nothing is pending', () => {
    render(<WordWheelWordLine {...base} letters={[]} />);
    expect(screen.queryByTestId('word-pending-letter')).toBeNull();
  });
});

describe('WordWheelWordLine — coverage banner owns the praise', () => {
  it('given a celebration banner is up, then the praise pill stays away so the two never stack', () => {
    render(
      <WordWheelWordLine
        {...base}
        letters={[]}
        feedback={{ message: '+96', type: 'success' }}
        acceptedWord="TAWING"
        acceptedId={1}
        celebrating
      />,
    );
    expect(screen.queryByTestId('word-feedback')).toBeNull();
    expect(screen.getByTestId('accepted-word-fly').textContent).toBe('TAWING');
  });

  it('given an error while a banner is up, then the reason still shows', () => {
    render(
      <WordWheelWordLine
        {...base}
        letters={[{ letter: 'A', wheelIndex: 0 }]}
        feedback={{ message: 'Not a valid word', type: 'error' }}
        celebrating
      />,
    );
    expect(screen.getByTestId('word-feedback').textContent).toBe('Not a valid word');
  });
});

describe('WordWheelWordLine — banner slot', () => {
  const banner = <div data-testid="banner-slot" />;

  it('given the line is empty, then the banner sits over it', () => {
    render(<WordWheelWordLine {...base} letters={[]} banner={banner} />);
    expect(screen.getByTestId('banner-slot')).toBeInTheDocument();
  });

  it('given the player starts the next word, then the banner gets out of the way', () => {
    const { rerender } = render(<WordWheelWordLine {...base} letters={[]} pending="T" banner={banner} />);
    expect(screen.queryByTestId('banner-slot')).toBeNull();
    rerender(<WordWheelWordLine {...base} letters={[{ letter: 'T', wheelIndex: 1 }]} banner={banner} />);
    expect(screen.queryByTestId('banner-slot')).toBeNull();
  });
});
