/**
 * Satisfying feedback on the entry, each sound tied to the player's own action:
 * a tick per code character, a lock-in when the code is complete, a pop when a
 * sheet opens. The entry is not a game screen, so every cue passes
 * `requiresGameActive: false` (the SFX context drops game-only cues otherwise);
 * mute, volume and audio-unlock stay the context's call.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const playSound = vi.fn();
vi.mock('@/contexts/SoundEffectsContext', () => ({ useSoundEffects: () => ({ playSound }) }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string, p?: Record<string, unknown>) => (p ? `${k}:${p.n}` : k), language: 'en', dir: 'ltr' }),
}));

import { CodeEntry } from '../CodeEntry';
import { EntrySheet } from '../EntrySheet';

const keys = () => playSound.mock.calls.map((c) => c[0]);
const boxes = () => screen.getAllByRole('textbox') as HTMLInputElement[];

describe('entry sound cues', () => {
  beforeEach(() => playSound.mockClear());

  it('every cue is allowed off the game screen', () => {
    render(<CodeEntry onSubmit={vi.fn()} />);
    fireEvent.change(boxes()[0], { target: { value: 'a' } });
    expect(playSound).toHaveBeenCalled();
    for (const [, options] of playSound.mock.calls) {
      expect(options).toMatchObject({ requiresGameActive: false });
    }
  });

  it('a tick per code character, a lock-in on the sixth', () => {
    render(<CodeEntry onSubmit={vi.fn()} />);
    'abc12'.split('').forEach((ch, i) => fireEvent.change(boxes()[i], { target: { value: ch } }));
    expect(keys()).toEqual(['tileSelect', 'tileSelect', 'tileSelect', 'tileSelect', 'tileSelect']);
    fireEvent.change(boxes()[5], { target: { value: 'z' } });
    expect(keys().at(-1)).toBe('pathConnect');
    expect(keys().filter((k) => k === 'pathConnect')).toHaveLength(1);
  });

  it('a rejected character makes no sound', () => {
    render(<CodeEntry onSubmit={vi.fn()} />);
    fireEvent.change(boxes()[0], { target: { value: '#' } });
    expect(playSound).not.toHaveBeenCalled();
  });

  it('a sheet pops open with a cue — once per opening, never while closed', () => {
    const { rerender } = render(<EntrySheet open={false} onClose={vi.fn()} title="T"><p>x</p></EntrySheet>);
    expect(playSound).not.toHaveBeenCalled();
    rerender(<EntrySheet open onClose={vi.fn()} title="T"><p>x</p></EntrySheet>);
    rerender(<EntrySheet open onClose={vi.fn()} title="T"><p>y</p></EntrySheet>);
    expect(keys()).toEqual(['menuOpen']);
  });
});
