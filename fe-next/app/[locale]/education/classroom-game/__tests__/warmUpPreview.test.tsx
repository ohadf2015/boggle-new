import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

let language = 'en';
vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: (k: string) => k, language }) }));
vi.mock('@/contexts/SoundEffectsContext', () => ({ useSoundEffects: () => ({ playTileSelectSound: vi.fn(), playStreakMilestoneSound: vi.fn() }) }));
vi.mock('@/hooks/useReducedEffects', () => ({ useReducedEffects: () => [false, vi.fn()] }));
vi.mock('@/lib/education/liveHaptics', () => ({ pulseLive: vi.fn() }));

import { WarmUpPreview } from '../WarmUpPreview';
import { LIVE_SURFACE_PREVIEW_KINDS } from '../previewKinds';

describe('?preview=warmup: the spelling warm-up with a sample list in the page language', () => {
  it('Then the preview kind is registered', () => {
    expect(LIVE_SURFACE_PREVIEW_KINDS).toContain('warmup');
  });

  for (const lang of ['en', 'he', 'es', 'ja', 'ru', 'sv']) {
    it(`Given ${lang}, Then it renders the spelling tiles, not the name tap game`, () => {
      language = lang;
      render(<WarmUpPreview />);
      expect(screen.getByTestId('waiting-warmup')).toHaveAttribute('data-kind', 'spell');
    });
  }
});
