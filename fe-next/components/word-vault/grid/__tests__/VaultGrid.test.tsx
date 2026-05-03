// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { VaultGrid } from '../VaultGrid';
import type { VaultGridConfig } from '@/lib/word-vault/grid/types';

const cfg: VaultGridConfig = {
  size: 3,
  letterSource: 'forced',
  letters: ['א', 'ש', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח'],
  traversal: 'anytap',
  targets: [{ word: 'אש' }],
  semanticGate: { class: 'name-male', acceptList: ['אש'] },
};

describe('VaultGrid (skeleton)', () => {
  it('renders 9 tiles for size 3', () => {
    render(<VaultGrid config={cfg} onSubmit={() => undefined} />);
    expect(screen.getAllByRole('button', { name: /vault-tile/i })).toHaveLength(9);
  });

  it('tapping tiles in anytap mode builds the selection in tap order', () => {
    const onSubmit = vi.fn();
    render(<VaultGrid config={cfg} onSubmit={onSubmit} />);
    const tiles = screen.getAllByRole('button', { name: /vault-tile/i });
    fireEvent.click(tiles[0]); // א
    fireEvent.click(tiles[1]); // ש
    fireEvent.click(screen.getByRole('button', { name: /vault-submit/i }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0][0]).toBe('אש');
  });

  it('clear button resets selection', () => {
    const onSubmit = vi.fn();
    render(<VaultGrid config={cfg} onSubmit={onSubmit} />);
    const tiles = screen.getAllByRole('button', { name: /vault-tile/i });
    fireEvent.click(tiles[0]);
    fireEvent.click(screen.getByRole('button', { name: /vault-clear/i }));
    fireEvent.click(screen.getByRole('button', { name: /vault-submit/i }));
    expect(onSubmit).not.toHaveBeenCalled();
  });
});

const adjacentCfg: VaultGridConfig = { ...cfg, traversal: 'adjacent' };

describe('VaultGrid adjacent mode', () => {
  it('rejects non-adjacent tap chain', () => {
    const onSubmit = vi.fn();
    render(<VaultGrid config={adjacentCfg} onSubmit={onSubmit} />);
    const tiles = screen.getAllByRole('button', { name: /vault-tile/i });
    // size=3 grid; index 0 (top-left) and index 2 (top-right) are NOT adjacent
    fireEvent.click(tiles[0]);
    fireEvent.click(tiles[2]); // should be rejected
    fireEvent.click(screen.getByRole('button', { name: /vault-submit/i }));
    // Only first letter selected → onSubmit fires with single letter
    expect(onSubmit).toHaveBeenCalledWith('א');
  });

  it('accepts adjacent diagonal taps', () => {
    const onSubmit = vi.fn();
    render(<VaultGrid config={adjacentCfg} onSubmit={onSubmit} />);
    const tiles = screen.getAllByRole('button', { name: /vault-tile/i });
    fireEvent.click(tiles[0]); // (0,0) א
    fireEvent.click(tiles[4]); // (1,1) ד — diagonal adjacent
    fireEvent.click(screen.getByRole('button', { name: /vault-submit/i }));
    expect(onSubmit).toHaveBeenCalledWith('אד');
  });
});
