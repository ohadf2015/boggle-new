import { afterEach, describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WordCraftZoomShell } from '../WordCraftZoomShell';

const realMatchMedia = window.matchMedia;

function setViewport(desktop: boolean) {
  window.matchMedia = ((query: string) => ({
    matches: desktop,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia;
}

describe('WordCraftZoomShell — desktop', () => {
  afterEach(() => {
    window.matchMedia = realMatchMedia;
  });

  it('given a desktop-sized board, when play starts, then the whole board stays in view', () => {
    setViewport(true);
    render(
      <WordCraftZoomShell focusCells={[{ row: 5, col: 5 }]} boardSize={11}>
        <div data-testid="board">child</div>
      </WordCraftZoomShell>,
    );
    expect(screen.queryByLabelText('Reset zoom')).not.toBeInTheDocument();
  });
});
