import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

const playPlayerJoinedSound = vi.fn();
vi.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => ({ playPlayerJoinedSound }),
}));

import ProjectorRoster from '../ProjectorRoster';

const t = (key: string) => key;

describe('ProjectorRoster — students arrive as avatars', () => {
  beforeEach(() => playPlayerJoinedSound.mockClear());

  it('gives every chip a face, seeded from the name when no avatar is stored', () => {
    render(<ProjectorRoster students={[{ username: 'Maya' }, { username: 'Leo' }]} t={t} />);
    expect(screen.getAllByTestId('projector-avatar')).toHaveLength(2);
  });

  it('says how many joined in words, not a raw key', () => {
    render(<ProjectorRoster students={[{ username: 'Maya' }]} t={t} />);
    expect(screen.getByTestId('projector-count-label')).toHaveTextContent('joined');
    expect(screen.getByTestId('projector-count-label').textContent).not.toMatch(/academy\./);
  });

  it('plays the join sound for a new arrival, never for students already in the room', () => {
    const { rerender } = render(<ProjectorRoster students={[{ username: 'Maya' }]} t={t} />);
    expect(playPlayerJoinedSound).not.toHaveBeenCalled();
    rerender(<ProjectorRoster students={[{ username: 'Maya' }, { username: 'Leo' }]} t={t} />);
    expect(playPlayerJoinedSound).toHaveBeenCalledTimes(1);
  });
});
