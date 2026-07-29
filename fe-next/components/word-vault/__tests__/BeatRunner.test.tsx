// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BeatRunner } from '../BeatRunner';
import { ROOM_R1_1 } from '@/lib/word-vault/beats/r1.1';

describe('BeatRunner (r1.1)', () => {
  it('renders one tap-clue button per scene object', () => {
    render(<BeatRunner room={ROOM_R1_1} onRoomComplete={() => undefined} />);
    expect(screen.getByRole('button', { name: /clue-tap-door/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /clue-tap-lantern/ })).toBeTruthy();
  });

  it('tapping a clue adds a fragment to the Notebook', () => {
    render(<BeatRunner room={ROOM_R1_1} onRoomComplete={() => undefined} />);
    fireEvent.click(screen.getByRole('button', { name: /clue-tap-lantern/ }));
    expect(screen.getByText('א')).toBeTruthy();
  });

  it('vault button summons the grid', () => {
    render(<BeatRunner room={ROOM_R1_1} onRoomComplete={() => undefined} />);
    expect(screen.queryAllByRole('button', { name: /vault-tile/ })).toHaveLength(0);
    fireEvent.click(screen.getByRole('button', { name: /summon-vault/ }));
    expect(screen.getAllByRole('button', { name: /vault-tile/ })).toHaveLength(9);
  });

  it('target-hit on the only beat fires onRoomComplete', () => {
    const onRoomComplete = vi.fn();
    render(<BeatRunner room={ROOM_R1_1} onRoomComplete={onRoomComplete} />);
    fireEvent.click(screen.getByRole('button', { name: /summon-vault/ }));

    // pangram of אש = grid contains א and ש; locate them
    const tiles = screen.getAllByRole('button', { name: /vault-tile/ });
    const aIdx = tiles.findIndex((t) => t.textContent === 'א');
    const shIdx = tiles.findIndex((t) => t.textContent === 'ש');
    expect(aIdx).toBeGreaterThanOrEqual(0);
    expect(shIdx).toBeGreaterThanOrEqual(0);
    fireEvent.click(tiles[aIdx]);
    fireEvent.click(tiles[shIdx]);
    fireEvent.click(screen.getByRole('button', { name: /vault-submit/ }));

    expect(onRoomComplete).toHaveBeenCalledTimes(1);
  });
});
