// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/utils/growthTracking', () => ({ trackGrowthEvent: vi.fn() }));
vi.mock('@/lib/speech/textToSpeech', () => ({ speakWord: vi.fn(), cancelSpeech: vi.fn() }));

import PracticeOverlay, { type PracticeOverlayProps } from '../_components/PracticeOverlay';

const mode = (title: string) => ({ title, sub: '' });
const props = (words: string[]): PracticeOverlayProps => ({
  locale: 'en',
  title: 'Practice',
  listTitle: 'L',
  lang: 'en',
  words: words.map((word) => ({ word, definition: '' })),
  playable: words,
  initialMode: 'tiles',
  labels: {
    close: 'Close',
    pick: 'Pick a mode',
    modes: { tiles: mode('Spell tiles'), grid: mode('Grid'), spelling: mode('Spelling'), matching: mode('Matching') },
    spell: { welcomeTitle: 'Ready to spell?', wordCount: '{count} words' } as PracticeOverlayProps['labels']['spell'],
  },
  teacherCta: { href: '/x' },
  onClose: vi.fn(),
});

describe('PracticeOverlay spell tiles', () => {
  it('Given a list whose words have no letters to place, When opened on spell tiles, Then it shows the picker without that mode', () => {
    render(<PracticeOverlay {...props(['-', ' '])} />);
    expect(screen.getByText('Pick a mode')).toBeTruthy();
    expect(screen.queryByText('Spell tiles')).toBeNull();
    expect(screen.getByText('Grid')).toBeTruthy();
  });

  it('Given a list mixing spellable and letterless words, When spell tiles starts, Then only spellable words are counted', () => {
    render(<PracticeOverlay {...props(['cat', '-', 'dog'])} />);
    expect(screen.getByText('2 words')).toBeTruthy();
  });
});
