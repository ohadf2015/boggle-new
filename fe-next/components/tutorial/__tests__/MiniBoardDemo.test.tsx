import { render, screen, within } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MiniBoardDemo, demoPath } from '../MiniBoardDemo';

describe('MiniBoardDemo: a 3x3 board, a finger swipes a real word, the chip pops +N', () => {
  it('lays the word on a 3x3 board along a diagonal-then-across path', () => {
    expect(demoPath(false)).toEqual([0, 4, 5]);
  });

  it('mirrors the path in RTL so the word still reads from its first letter', () => {
    expect(demoPath(true)).toEqual([2, 4, 3]);
  });

  it('renders nine tiles with the word on its path, and the points chip', () => {
    render(<MiniBoardDemo word="CAT" points={3} reduced />);
    const tiles = screen.getAllByTestId('mini-tile');
    expect(tiles).toHaveLength(9);
    expect(tiles[0]).toHaveTextContent('C');
    expect(tiles[4]).toHaveTextContent('A');
    expect(tiles[5]).toHaveTextContent('T');
    const chip = screen.getByTestId('mini-chip');
    expect(within(chip).getByText('CAT')).toBeInTheDocument();
    expect(chip).toHaveTextContent('+3');
  });

  it('reduced motion: a still final frame, no moving finger', () => {
    render(<MiniBoardDemo word="CAT" points={3} reduced />);
    expect(screen.queryByTestId('mini-finger')).toBeNull();
  });

  it('splits by code point, so a non-Latin word keeps its letters whole', () => {
    render(<MiniBoardDemo word="שיר" points={3} rtl reduced />);
    const tiles = screen.getAllByTestId('mini-tile');
    expect(tiles[2]).toHaveTextContent('ש');
    expect(tiles[4]).toHaveTextContent('י');
    expect(tiles[3]).toHaveTextContent('ר');
  });

  it('the finger is a hollow ring resting below-right of each letter, so the letter stays readable', () => {
    render(<MiniBoardDemo word="CAT" points={3} />);
    const finger = screen.getByTestId('mini-finger');
    expect(finger.className).toContain('bg-transparent');
    expect(finger.getAttribute('data-offset')).toBe('below-right');
  });
});
