/**
 * The share button is the client half of the broken-share fix: it must be live
 * on a real win (a dimmed share button on the victory screen would read as
 * broken) and dead while the run has not resolved what the card needs — the
 * captured "Unknown Boss / WORLD NAN" image is what a tap on a half-resolved
 * run produces.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

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

  describe('link fallback when the image file cannot be shared', () => {
    const setNav = (share: unknown, writeText: unknown) => {
      Object.defineProperty(navigator, 'share', { value: share, configurable: true, writable: true });
      Object.defineProperty(navigator, 'canShare', { value: undefined, configurable: true, writable: true });
      Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    };
    afterEach(() => {
      setNav(undefined, undefined);
      vi.unstubAllGlobals();
    });

    it('Given the sheet is dismissed, then nothing is copied and no copied state shows', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
      const writeText = vi.fn().mockResolvedValue(undefined);
      const share = vi.fn().mockRejectedValue(new DOMException('x', 'AbortError'));
      setNav(share, writeText);
      render(<BossShareButton world={3} word="knowledge" stars={3} />);
      fireEvent.click(screen.getByTestId('boss-share'));
      await waitFor(() => expect(share).toHaveBeenCalledOnce());
      expect(writeText).not.toHaveBeenCalled();
      await waitFor(() =>
        expect(screen.getByTestId('boss-share')).toHaveAttribute('aria-label', 'adventurePlay.eco.share'),
      );
    });

    it('Given no native share, then the link is copied and the copied state shows', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
      const writeText = vi.fn().mockResolvedValue(undefined);
      setNav(undefined, writeText);
      render(<BossShareButton world={3} word="knowledge" stars={3} />);
      fireEvent.click(screen.getByTestId('boss-share'));
      await waitFor(() =>
        expect(screen.getByTestId('boss-share')).toHaveAttribute('aria-label', 'adventurePlay.eco.shareCopied'),
      );
      expect(writeText).toHaveBeenCalledWith(expect.stringContaining('/api/og/boss-defeat'));
    });
  });
});
