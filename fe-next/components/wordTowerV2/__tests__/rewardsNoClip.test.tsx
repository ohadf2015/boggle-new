import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { V2Celebrations } from '../V2Celebrations';
import { DailyGoalCard } from '../DailyGoalCard';
import { MilestoneBurst } from '../rewards/MilestoneBurst';
import { TierBurst } from '../rewards/TierBurst';

const staticOverlay = vi.hoisted(() => ({ value: false }));
vi.mock('@/lib/native/webViewLayerFlash', () => ({
  prefersStaticFullscreenOverlay: () => staticOverlay.value,
}));

afterEach(() => {
  cleanup();
  staticOverlay.value = false;
});

const t = (key: string, params?: Record<string, string | number>) =>
  params ? `${key}:${Object.values(params).join(',')}` : key;

describe('V2Celebrations long copy', () => {
  it('given a loud callout in a long locale, then the pill wraps inside the screen instead of running off it', () => {
    render(
      <V2Celebrations
        t={t}
        callout={{ key: 1, tone: 'green', textKey: 'wordTowerV2.callout.perfect' } as never}
        banners={[]}
        onBannerDone={vi.fn()}
      />,
    );
    const pill = document.querySelector('[data-wt2-callout]');
    expect(pill?.className).toMatch(/max-w-full/);
    expect(pill?.className).toMatch(/break-words/);
    expect(pill?.className).toMatch(/text-center/);
  });
});

describe('DailyGoalCard on a phone', () => {
  it('given a tall HUD, then the floating card sits below the measured HUD edge', () => {
    render(<DailyGoalCard t={t} growthM={12} onKeepClimbing={vi.fn()} onBank={vi.fn()} />);
    expect(screen.getByRole('status').className).toContain('--wt2-hud');
  });
});

describe('MilestoneBurst bounds and punch', () => {
  it('given a milestone, then the card is width-bounded so a long locale cannot clip', () => {
    render(<MilestoneBurst t={t} milestone={{ key: 1, floors: 10 } as never} onDone={vi.fn()} />);
    const card = screen.getByLabelText('wordTowerV2.milestone.a11y:10');
    expect(card.className).toMatch(/max-w-/);
  });

  it('given motion, then a shock ring punches out behind the card', () => {
    render(<MilestoneBurst t={t} milestone={{ key: 1, floors: 10 } as never} onDone={vi.fn()} />);
    expect(document.querySelector('[data-wt2-milestone-ring]')).toBeTruthy();
  });

  it('given reduced motion, then no ring is thrown', () => {
    render(<MilestoneBurst t={t} milestone={{ key: 1, floors: 10 } as never} onDone={vi.fn()} reducedMotion />);
    expect(document.querySelector('[data-wt2-milestone-ring]')).toBeNull();
  });
});

describe('TierBurst full-screen flood (mobile web flash)', () => {
  it('given desktop, then the flood animates', () => {
    render(<TierBurst tier="epic" rattling={false} popped />);
    expect(document.querySelector('[data-wt2-tier-flood]')?.getAttribute('data-static')).toBe('false');
  });

  it('given a mobile renderer, then the full-screen flood appears statically (no opacity tween layer)', () => {
    staticOverlay.value = true;
    render(<TierBurst tier="epic" rattling={false} popped />);
    expect(document.querySelector('[data-wt2-tier-flood]')?.getAttribute('data-static')).toBe('true');
  });
});
