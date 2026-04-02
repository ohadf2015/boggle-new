/**
 * FlashChallengeToast Accessibility Tests
 *
 * Verifies dismiss button meets WCAG 44x44px touch target minimum.
 */

import { render, screen } from '@testing-library/react';
import { FlashChallengeToast } from '../FlashChallengeToast';
import type { FlashChallenge } from '@/types/adventure';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));

const challenge: FlashChallenge = {
  id: 'flash-1',
  type: 'longWord',
  descriptionKey: 'adventure.quests.flash.longWord',
  param: 6,
  durationSeconds: 30,
  rewardCoins: 50,
  rewardScore: 100,
};

describe('FlashChallengeToast accessibility', () => {
  it('dismiss button should have at least 44px touch target (WCAG 2.5.5)', () => {
    render(
      <FlashChallengeToast challenge={challenge} isComplete={false} onDismiss={vi.fn()} timeLeft={25} />
    );
    const btn = screen.getByTestId('challenge-dismiss');
    // min-w-[44px] min-h-[44px] classes (or equivalent) must be present
    const cls = btn.className;
    const has44Width = cls.includes('min-w-[44px]') || cls.includes('w-11') || cls.includes('w-12');
    const has44Height = cls.includes('min-h-[44px]') || cls.includes('h-11') || cls.includes('h-12');
    expect(has44Width).toBe(true);
    expect(has44Height).toBe(true);
  });
});
