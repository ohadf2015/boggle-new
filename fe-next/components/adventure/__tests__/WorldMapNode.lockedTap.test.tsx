/**
 * A locked world orb's onClick never reaches the parent — it only flips local
 * `showStarGate` state. That reads to PostHog as a dead/rage click with no
 * event to attribute it to (same gap practice_tile_locked_tapped closed).
 * This pins the fix: tapping a locked orb fires a growth event.
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { WorldNode } from '../WorldMapNode';
import { trackGrowthEvent } from '@/utils/growthTracking';
import type { WorldConfig } from '@/lib/adventure/worldConfig';

vi.mock('@/utils/growthTracking', () => ({ trackGrowthEvent: vi.fn() }));

vi.mock('@/components/motion/AdaptiveMotion', () => ({
  AdaptiveMotion: new Proxy(
    {},
    {
      get: (_t, el: string) => {
        const C = React.forwardRef(
          ({ children, whileHover, whileTap, animate, transition, ...props }: any, ref: any) =>
            React.createElement(el, { ...props, ref }, children),
        );
        C.displayName = `MockAdaptiveMotion.${el}`;
        return C;
      },
    },
  ),
}));

vi.mock('next/image', () => ({
  __esModule: true,
  default: ({ src, alt, ...props }: any) => React.createElement('img', { src, alt, ...props }),
}));

vi.mock('@/hooks/usePrefersReducedMotion', () => ({ usePrefersReducedMotion: () => false }));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, dir: 'ltr', locale: 'en' }),
}));

vi.mock('../WorldMapDecorations', () => ({ WorldOrbitingLetters: () => null }));
vi.mock('../MasteryBadge', () => ({ MasteryBadge: () => null }));
vi.mock('../play/variants/WorldRouteStrip', () => ({ default: () => null }));
vi.mock('../play/variants/trailLayout', () => ({ rampOf: () => [] }));

const world: WorldConfig = {
  id: 3,
  name: 'caverns',
  theme: 'caverns',
  mechanic: null,
  bossName: 'bossCaverns',
  colorPrimary: 'rgba(0,0,0,1)',
  colorSecondary: 'rgba(0,0,0,1)',
  description: 'caverns',
};

const baseProps = {
  world,
  unlockRequirement: 20,
  currentStars: 0,
  completedLevels: 0,
  totalWorldStars: 30,
  onClick: vi.fn(),
  index: 0,
  isLeft: true,
};

describe('WorldNode locked tap', () => {
  it('fires adventure_locked_world_tapped when a locked orb is tapped', () => {
    const { getByTestId } = render(<WorldNode {...baseProps} isUnlocked={false} />);

    fireEvent.click(getByTestId('world-3'));

    expect(trackGrowthEvent).toHaveBeenCalledWith('adventure_locked_world_tapped', { worldId: 3 });
  });

  it('does not fire the locked event when the orb is unlocked', () => {
    const { getByTestId } = render(<WorldNode {...baseProps} isUnlocked />);

    fireEvent.click(getByTestId('world-3'));

    expect(trackGrowthEvent).not.toHaveBeenCalled();
    expect(baseProps.onClick).toHaveBeenCalled();
  });
});
