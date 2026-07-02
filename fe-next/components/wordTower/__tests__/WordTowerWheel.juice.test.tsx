import { describe, it, expect, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

import { WordTowerWheel } from '../WordTowerWheel';

const baseProps = {
  tray: ['C', 'A', 'T', 'S', 'E', 'R'],
  selected: [] as number[],
  word: '',
  placing: false,
  canBuild: false,
  intensity: 0,
  accentHex: '#00ffff',
  reducedMotion: true,
  dir: 'ltr' as const,
  t: (k: string) => k,
  onSelectTile: vi.fn(),
  onSubmit: vi.fn(),
  onDrop: vi.fn(),
};

describe('WordTowerWheel build juice', () => {
  it('shows the height reward preview on the BUILD hub', () => {
    render(
      <WordTowerWheel {...baseProps} selected={[0, 1, 2]} word="CAT" canBuild gainPreview="+3m" />,
    );
    expect(screen.getByText('+3m')).toBeTruthy();
    cleanup();
  });

  it('omits the preview when none is provided', () => {
    render(<WordTowerWheel {...baseProps} selected={[0, 1, 2]} word="CAT" canBuild />);
    expect(screen.queryByText(/\+\dm/)).toBeNull();
    cleanup();
  });

  it('pops the most recently selected tile', () => {
    render(<WordTowerWheel {...baseProps} selected={[0, 1]} word="CA" reducedMotion={false} />);
    const tiles = screen.getAllByRole('button');
    const popped = tiles.filter((b) => b.querySelector('.wt-tile-pop'));
    expect(popped).toHaveLength(1);
    expect(popped[0].getAttribute('data-wheel-index')).toBe('1');
    cleanup();
  });

  it('does not pop tiles under reduced motion', () => {
    render(<WordTowerWheel {...baseProps} selected={[0, 1]} word="CA" reducedMotion />);
    const tiles = screen.getAllByRole('button');
    expect(tiles.some((b) => b.querySelector('.wt-tile-pop'))).toBe(false);
    cleanup();
  });
});
