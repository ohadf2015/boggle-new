import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en', t: (k: string) => k }),
}));
vi.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => ({ playButtonClickSound: vi.fn() }),
}));

import PracticePostCompleteChip from '../PracticePostCompleteChip';

describe('PracticePostCompleteChip', () => {
  it('renders nothing when open is false', () => {
    render(<PracticePostCompleteChip open={false} mode="classic" />);
    expect(screen.queryByTestId('practice-post-complete-chip')).toBeNull();
  });

  it('renders chain CTA wrapper when open', () => {
    render(<PracticePostCompleteChip open mode="classic" />);
    expect(screen.getByTestId('practice-post-complete-chip')).toBeInTheDocument();
    expect(screen.getByTestId('practice-chain-cta')).toBeInTheDocument();
  });
});
