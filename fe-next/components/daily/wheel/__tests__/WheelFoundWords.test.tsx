import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import WheelFoundWords from '../WheelFoundWords';

const score = (w: string) => w.length * 2;

describe('WheelFoundWords', () => {
  it('given found words, then each one is spelled out in tiles with its points', () => {
    render(<WheelFoundWords words={['CAB', 'BEAD']} fresh={null} score={score} dir="ltr" reducedMotion />);
    const words = screen.getAllByTestId('found-word');
    expect(words).toHaveLength(2);
    expect(words[1].querySelectorAll('[data-testid="found-word-tile"]')).toHaveLength(4);
    expect(words[1].textContent).toBe('BEAD+8');
  });

  it('given the word just found, then only that one is marked fresh', () => {
    render(<WheelFoundWords words={['CAB', 'BEAD']} fresh="BEAD" score={score} dir="ltr" reducedMotion />);
    const [first, second] = screen.getAllByTestId('found-word');
    expect(first.dataset.fresh).toBe('false');
    expect(second.dataset.fresh).toBe('true');
  });

  it('given a Hebrew wheel, then the tiles read right to left', () => {
    render(<WheelFoundWords words={['הימ']} fresh={null} score={score} dir="rtl" reducedMotion />);
    expect(screen.getByTestId('found-word').querySelector('[dir="rtl"]')).not.toBeNull();
  });
});
