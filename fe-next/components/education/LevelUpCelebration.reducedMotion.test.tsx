import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { motionPref } from '@/components/education/motion/__tests__/reducedMotion.mock';
import { LevelUpCelebration } from './LevelUpCelebration';

const confetti = vi.fn();
vi.mock('@/utils/confettiUtils', () => ({ fireLevelUpConfetti: () => confetti() }));
vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: (k: string) => k }) }));
vi.mock('@/components/ui/SilentVideo', () => ({ SilentVideo: () => null }));

const data = { oldLevel: 3, newLevel: 4 };

beforeEach(() => {
  confetti.mockReset();
});

describe('LevelUpCelebration motion', () => {
  it('pops the card and the level badge and fires confetti when motion is allowed', () => {
    motionPref.reduced = false;
    render(<LevelUpCelebration levelUpData={data} onClose={() => {}} />);
    expect(confetti).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('dialog').innerHTML).toMatch(/lvl-pop/);
  });

  it('shows the same card still, with no confetti, when the student reduces motion (OS or in-app)', () => {
    motionPref.reduced = true;
    render(<LevelUpCelebration levelUpData={data} onClose={() => {}} />);
    expect(confetti).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog').innerHTML).not.toMatch(/animate-\[lvl-pop/);
    expect(screen.getByText('4')).toBeInTheDocument();
  });
});
