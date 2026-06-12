/**
 * DrillProgressionOverlay celebration-audio wiring.
 *
 * NOTE: this asserts the overlay CALLS the right sound fn on open — it does not
 * prove audio actually plays (the real guard trace + an in-app run cover that).
 */

import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const playLevelUpModalSound = vi.fn();
const playAchievementSound = vi.fn();

vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  m: {
    div: ({ children, className, role, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      <div className={className} role={role} {...props}>{children}</div>
    ),
    p: ({ children }: React.HTMLAttributes<HTMLParagraphElement>) => <p>{children}</p>,
    h2: ({ children }: React.HTMLAttributes<HTMLHeadingElement>) => <h2>{children}</h2>,
  },
}));

vi.mock('@/utils/ThemeContext', () => ({ useTheme: () => ({ theme: 'dark' }) }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k }),
}));
vi.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => ({ playLevelUpModalSound, playAchievementSound }),
}));

import DrillProgressionOverlay from '../DrillProgressionOverlay';

const baseProps = {
  isOpen: true,
  onClose: vi.fn(),
  targetDomain: 'processingSpeed' as const,
  newDomainScore: 72,
  scoreDelta: 8,
  overallScore: 65,
  tier: 'advanced' as const,
};

describe('DrillProgressionOverlay celebration audio', () => {
  beforeEach(() => {
    playLevelUpModalSound.mockClear();
    playAchievementSound.mockClear();
  });

  it('plays the level-up jingle when the drill promoted a level', () => {
    render(<DrillProgressionOverlay {...baseProps} levelUp={{ newLevel: 3, previousLevel: 2 }} />);
    expect(playLevelUpModalSound).toHaveBeenCalledTimes(1);
    expect(playAchievementSound).not.toHaveBeenCalled();
  });

  it('plays the achievement sting on a personal best with no level change', () => {
    render(
      <DrillProgressionOverlay
        {...baseProps}
        improvement={{ isPersonalBest: true, improvedVsLast: false, totalPlays: 4, averageScore: 50, currentScore: 80 }}
      />,
    );
    expect(playAchievementSound).toHaveBeenCalledTimes(1);
    expect(playLevelUpModalSound).not.toHaveBeenCalled();
  });

  it('stays silent on a plain progression (in-drill complete sound already fired)', () => {
    render(<DrillProgressionOverlay {...baseProps} />);
    expect(playLevelUpModalSound).not.toHaveBeenCalled();
    expect(playAchievementSound).not.toHaveBeenCalled();
  });

  it('does not play when overlay is closed', () => {
    render(<DrillProgressionOverlay {...baseProps} isOpen={false} levelUp={{ newLevel: 3, previousLevel: 2 }} />);
    expect(playLevelUpModalSound).not.toHaveBeenCalled();
  });
});
