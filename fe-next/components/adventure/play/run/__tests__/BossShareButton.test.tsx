/**
 * The share button is the client half of the broken-share fix: it must be live
 * on a real win (a dimmed share button on the victory screen would read as
 * broken) and dead while the run has not resolved what the card needs — the
 * captured "Unknown Boss / WORLD NAN" image is what a tap on a half-resolved
 * run produces.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguageSafe: () => ({ t: (k: string) => k, language: 'en' }),
}));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ profile: { display_name: 'Ohad' } }),
}));
vi.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => ({ playButtonClickSound: () => {} }),
}));

import BossShareButton from '../BossShareButton';

describe('BossShareButton', () => {
  it('Given a finished win, then the share button is live', () => {
    render(<BossShareButton world={3} word="knowledge" stars={3} />);
    expect(screen.getByTestId('boss-share')).toBeEnabled();
  });

  it('Given the killing word has not resolved, then the button cannot request a card with a hole in it', () => {
    render(<BossShareButton world={3} word={null} stars={3} />);
    expect(screen.getByTestId('boss-share')).toBeDisabled();
  });

  it('Given no star count yet, then it stays disabled too', () => {
    render(<BossShareButton world={3} word="knowledge" stars={null} />);
    expect(screen.getByTestId('boss-share')).toBeDisabled();
  });
});
