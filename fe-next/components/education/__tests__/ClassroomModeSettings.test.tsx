/**
 * The teacher's per-mode settings panel.
 *
 * The mode grid was previously the only per-mode control, and it was the same
 * four buttons no matter which mode was picked — so "Word Hunt" in a classroom
 * hunted a random dictionary word with no relation to the lesson. This panel is
 * where a mode gets to ask the teacher for what only they can decide.
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { ClassroomModeSettings } from '../ClassroomModeSettings';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, params?: Record<string, string | number>) =>
      params ? `${key}:${JSON.stringify(params)}` : key,
  }),
}));

const vocab = ['atom', 'photon', 'neutron', 'photosynthesis'];

function setup(overrides: Partial<React.ComponentProps<typeof ClassroomModeSettings>> = {}) {
  const props = {
    gameMode: 'word-hunt' as const,
    targetWord: '',
    minWordLength: 3,
    allPlayableWords: vocab,
    onGameModeChange: vi.fn(),
    onTargetWordChange: vi.fn(),
    onMinWordLengthChange: vi.fn(),
    ...overrides,
  };
  render(<ClassroomModeSettings {...props} />);
  return props;
}

describe('ClassroomModeSettings', () => {
  it('offers the four classroom game modes', () => {
    setup();
    expect(screen.getByRole('radio', { name: /gameModes.classic/ })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /gameModes.wordHunt/ })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /gameModes.blast/ })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /gameModes.wheelRush/ })).toBeInTheDocument();
  });

  it('only asks for a hunted word when Word Hunt is the chosen mode', () => {
    setup({ gameMode: 'classic' });
    expect(screen.queryByRole('radiogroup', { name: /huntTarget.title/ })).not.toBeInTheDocument();
  });

  it('offers only the lesson words Word Hunt can actually serve as a target', () => {
    setup();
    // photon (6) and neutron (7) are in the band; atom (4) and
    // photosynthesis (14) can never be hunted.
    expect(screen.getByRole('radio', { name: 'photon' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'neutron' })).toBeInTheDocument();
    expect(screen.queryByRole('radio', { name: 'atom' })).not.toBeInTheDocument();
    expect(screen.queryByRole('radio', { name: 'photosynthesis' })).not.toBeInTheDocument();
  });

  it('lets the teacher pin a word', async () => {
    const props = setup();
    await userEvent.click(screen.getByRole('radio', { name: 'photon' }));
    expect(props.onTargetWordChange).toHaveBeenCalledWith('photon');
  });

  it('always offers handing the choice back to the game', async () => {
    const props = setup({ targetWord: 'photon' });
    await userEvent.click(screen.getByRole('radio', { name: /huntTarget.random/ }));
    expect(props.onTargetWordChange).toHaveBeenCalledWith('');
  });

  it('explains why no word is offered instead of showing an empty picker', () => {
    setup({ allPlayableWords: ['atom', 'cat'] });
    expect(screen.getByText(/huntTarget.noneEligible/)).toBeInTheDocument();
    expect(screen.queryByRole('radio', { name: 'atom' })).not.toBeInTheDocument();
  });

  it('clears a pinned word that the current lesson no longer contains', () => {
    const props = setup({ targetWord: 'photon', allPlayableWords: ['cat', 'neutron'] });
    expect(props.onTargetWordChange).toHaveBeenCalledWith('');
  });

  it('marks the pinned word as the selected radio', () => {
    setup({ targetWord: 'neutron' });
    expect(screen.getByRole('radio', { name: 'neutron' })).toHaveAttribute(
      'aria-checked',
      'true'
    );
  });

  it('lets the teacher set the minimum word length for the grade they teach', async () => {
    const props = setup({ gameMode: 'classic' });
    await userEvent.click(screen.getByRole('radio', { name: /minWordLength.len5/ }));
    expect(props.onMinWordLengthChange).toHaveBeenCalledWith(5);
  });

  it('marks the current minimum word length as selected', () => {
    setup({ gameMode: 'classic', minWordLength: 4 });
    expect(screen.getByRole('radio', { name: /minWordLength.len4/ })).toHaveAttribute(
      'aria-checked',
      'true'
    );
  });

  it('offers the minimum word length in every mode, not just classic', () => {
    setup({ gameMode: 'word-hunt' });
    expect(screen.getByRole('radio', { name: /minWordLength.len3/ })).toBeInTheDocument();
  });
});
