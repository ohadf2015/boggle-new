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

describe('VaultGrid + classifier integration', () => {
  it('emits target-hit SubmitResult when target word is built', () => {
    const onResult = vi.fn();
    render(<VaultGrid config={cfg} onResult={onResult} />);
    const tiles = screen.getAllByRole('button', { name: /vault-tile/i });
    fireEvent.click(tiles[0]); // א
    fireEvent.click(tiles[1]); // ש
    fireEvent.click(screen.getByRole('button', { name: /vault-submit/i }));
    expect(onResult).toHaveBeenCalledTimes(1);
    expect(onResult.mock.calls[0][0].kind).toBe('target-hit');
  });

  it('emits invalid too-short for single tile submit', () => {
    const onResult = vi.fn();
    render(<VaultGrid config={cfg} onResult={onResult} />);
    const tiles = screen.getAllByRole('button', { name: /vault-tile/i });
    fireEvent.click(tiles[0]);
    fireEvent.click(screen.getByRole('button', { name: /vault-submit/i }));
    expect(onResult.mock.calls[0][0]).toEqual({ kind: 'invalid', reason: 'too-short' });
  });

  it('clears submitted-set across distinct grid mounts (per-beat scope)', () => {
    const onResult = vi.fn();
    const { unmount } = render(<VaultGrid config={cfg} onResult={onResult} />);
    let tiles = screen.getAllByRole('button', { name: /vault-tile/i });
    fireEvent.click(tiles[0]); fireEvent.click(tiles[1]);
    fireEvent.click(screen.getByRole('button', { name: /vault-submit/i }));
    unmount();
    render(<VaultGrid config={cfg} onResult={onResult} />);
    tiles = screen.getAllByRole('button', { name: /vault-tile/i });
    fireEvent.click(tiles[0]); fireEvent.click(tiles[1]);
    fireEvent.click(screen.getByRole('button', { name: /vault-submit/i }));
    expect(onResult.mock.calls[1][0].kind).toBe('target-hit'); // not 'used'
  });
});
