import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { LandingModes } from '../LandingModes';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));

describe('LandingModes poster art', () => {
  it('pins every poster to its frame so Safari cannot size a grid row off an unloaded lazy image and clip it out of view', () => {
    render(<LandingModes />);
    const cards = screen.getAllByTestId('landing-mode-card');
    expect(cards.length).toBeGreaterThanOrEqual(7);
    for (const card of cards) {
      const img = card.querySelector('img');
      expect(img).not.toBeNull();
      const frame = img!.parentElement!;
      expect(frame.className).not.toMatch(/(^|\s)grid(\s|$)/);
      expect(frame.className).toMatch(/(^|\s)relative(\s|$)/);
      expect(img!.className).toMatch(/(^|\s)absolute(\s|$)/);
      expect(img!.className).toMatch(/(^|\s)inset-0(\s|$)/);
      expect(img!.className).toMatch(/(^|\s)size-full(\s|$)/);
      expect(img!.className).not.toMatch(/w-auto/);
    }
  });
});
