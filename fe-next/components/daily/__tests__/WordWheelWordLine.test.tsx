import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import WordWheelWordLine from '../WordWheelWordLine';

const t = (key: string, params?: Record<string, unknown>) =>
  params ? `${key}:${JSON.stringify(params)}` : key;

const base = {
  t,
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

describe('WordWheelWordLine', () => {
  it('shows the placeholder with a caret when nothing is built', () => {
    render(<WordWheelWordLine {...base} letters={[]} />);
    expect(screen.getByText('wordWheel.tapLetters')).toBeInTheDocument();
    expect(screen.getByTestId('word-caret')).toBeInTheDocument();
  });

  it('hides the placeholder text while an accepted word flies off', () => {
    render(
      <WordWheelWordLine
        {...base}
        letters={[]}
        feedback={{ message: '+30', type: 'success' }}
        acceptedWord="CATS"
        acceptedPoints={30}
        acceptedId={1}
      />,
    );
    expect(screen.queryByText('wordWheel.tapLetters')).toBeNull();
    expect(screen.getByTestId('word-caret')).toBeInTheDocument();
  });

  it('renders each built letter as a removable letter and marks the center one', () => {
    const onRemove = vi.fn();
    render(
      <WordWheelWordLine
        {...base}
        onRemove={onRemove}
        letters={[{ letter: 'C', wheelIndex: -1 }, { letter: 'A', wheelIndex: 0 }]}
      />,
    );
    const tiles = screen.getAllByTestId('built-letter-tile');
    expect(tiles).toHaveLength(2);
    expect(tiles[0].getAttribute('data-center')).toBe('true');
    fireEvent.click(tiles[1]);
    expect(onRemove).toHaveBeenCalledWith(1);
  });

  it('previews the points once the word is long enough to score', () => {
    const letters = ['C', 'A', 'T', 'S'].map((letter, i) => ({ letter, wheelIndex: i - 1 }));
    render(<WordWheelWordLine {...base} letters={letters} />);
    expect(screen.getByTestId('word-points-preview').textContent).toBe('+30');
  });

  it('keeps the inline submit chip next to the word', () => {
    const onSubmit = vi.fn();
    render(<WordWheelWordLine {...base} onSubmit={onSubmit} letters={[{ letter: 'C', wheelIndex: -1 }]} />);
    fireEvent.click(screen.getByTestId('inline-submit-chip'));
    expect(onSubmit).toHaveBeenCalled();
  });

  it('praises an accepted word by its length and shows its points', () => {
    render(
      <WordWheelWordLine
        {...base}
        letters={[]}
        feedback={{ message: '+60', type: 'success' }}
        acceptedWord="CRATE"
        acceptedId={1}
      />,
    );
    const toast = screen.getByTestId('word-feedback');
    expect(toast.textContent).toContain('wordWheel.praise.superb');
    expect(toast.textContent).toContain('+60');
    expect(screen.getByTestId('accepted-word-fly').textContent).toBe('CRATE');
  });

  it('calls out a full-wheel word', () => {
    render(
      <WordWheelWordLine
        {...base}
        letters={[]}
        feedback={{ message: '+300', type: 'success' }}
        acceptedWord="CANTERS"
        acceptedId={2}
      />,
    );
    expect(screen.getByTestId('word-feedback').textContent).toContain('wordWheel.praise.fullWheel');
  });

  it('shows the rejection reason as one label', () => {
    render(
      <WordWheelWordLine
        {...base}
        letters={[{ letter: 'A', wheelIndex: 0 }]}
        feedback={{ message: 'Not a valid word', type: 'error' }}
        shake
      />,
    );
    const toast = screen.getByTestId('word-feedback');
    expect(toast.textContent).toBe('Not a valid word');
    expect(toast.getAttribute('data-kind')).toBe('error');
  });
});
