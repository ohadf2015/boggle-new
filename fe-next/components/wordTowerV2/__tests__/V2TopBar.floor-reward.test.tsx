import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { createRun } from '@/lib/wordTowerV2/run';
import { V2TopBar } from '../V2TopBar';

afterEach(cleanup);

const t = (key: string, params?: Record<string, string | number>) => {
  if (!params) return key;
  return `${key}:${Object.values(params).join(',')}`;
};

const bar = (over: Partial<Parameters<typeof V2TopBar>[0]> = {}) => (
  <V2TopBar
    t={t}
    heightM={9}
    score={520}
    bestM={0}
    run={createRun(1)}
    coins={1200}
    coinsRef={{ current: null }}
    daily={false}
    {...over}
  />
);

describe('V2TopBar floor reward animation', () => {
  it('given a floor is built (heightM increases), when rendered, then the height counter animates with the pop class', () => {
    const { rerender, container } = render(bar({ heightM: 3.5 }));

    // Get initial height display
    const initialHeight = screen.getByLabelText(/wordTowerV2\.hud\.floorA11y/);
    expect(initialHeight).toBeTruthy();

    // Rerender with increased height (floor built)
    rerender(bar({ heightM: 4.2 }));

    // The height counter should have an animation applied (it exists and has animate class)
    const heightCounter = container.querySelector('[data-wt2-height-pop]');
    expect(heightCounter).toBeTruthy();
    const classes = heightCounter!.getAttribute('class') ?? '';
    expect(classes).toMatch(/animate-neo-pop/);
  });

  it('given a floor is built, when rendered, then the delta is displayed above the height counter', () => {
    const { rerender, container } = render(bar({ heightM: 3.5 }));

    // Rerender with increased height to trigger the delta
    rerender(bar({ heightM: 4.2 }));

    // The delta should be present and show a positive increase
    const delta = container.querySelector('[data-wt2-height-delta]');
    expect(delta).toBeTruthy();
    const text = delta!.textContent ?? '';
    expect(text).toMatch(/\+/);
    expect(text).toMatch(/\d+\.\d/); // Should have decimal format like +0.7
  });

  it('given reducedMotion is true, when a floor is built, then the delta shows but animation is not applied', () => {
    const { rerender, container } = render(bar({
      heightM: 3.5,
      reducedMotion: true
    }));

    rerender(bar({
      heightM: 4.2,
      reducedMotion: true
    }));

    const heightCounter = container.querySelector('[data-wt2-height-pop]');
    expect(heightCounter).toBeTruthy();
    const classes = heightCounter!.getAttribute('class') ?? '';
    // Should NOT have the pop animation class when reducedMotion is true
    expect(classes).not.toMatch(/animate-neo-pop/);

    // But the delta should still show
    const delta = container.querySelector('[data-wt2-height-delta]');
    expect(delta).toBeTruthy();
  });

  it('given a floor crumbles (heightM decreases), when rendered, then no pop animation fires', () => {
    const { rerender, container } = render(bar({ heightM: 5.0 }));

    // Rerender with decreased height (floor lost)
    rerender(bar({ heightM: 4.1 }));

    // The pop animation should NOT be applied on decrease
    const heightCounter = container.querySelector('[data-wt2-height-pop]');
    expect(heightCounter).toBeTruthy();
    const classes = heightCounter!.getAttribute('class') ?? '';
    expect(classes).not.toMatch(/animate-neo-pop/);

    // Delta should not appear on decrease
    const delta = container.querySelector('[data-wt2-height-delta]');
    expect(delta).toBeNull();
  });

  it('given a run resumes with floors > 0, when mounted, then no pop animation fires on initial render', () => {
    const { container } = render(bar({
      heightM: 5.0,
      run: { ...createRun(1), floors: 5 }
    }));

    // On initial mount with non-zero height, animation should not be applied
    const heightCounter = container.querySelector('[data-wt2-height-pop]');
    expect(heightCounter).toBeTruthy();
    const classes = heightCounter!.getAttribute('class') ?? '';
    expect(classes).not.toMatch(/animate-neo-pop/);

    // Delta should not appear on mount
    const delta = container.querySelector('[data-wt2-height-delta]');
    expect(delta).toBeNull();
  });

  it('given multiple floors built in succession, when each one lands, then each shows its delta', () => {
    const { rerender, container } = render(bar({ heightM: 3.0 }));

    // First floor lands — height increases triggers animation and delta
    rerender(bar({ heightM: 3.7 }));
    let delta = container.querySelector('[data-wt2-height-delta]');
    expect(delta).toBeTruthy();
    let deltaText = delta!.textContent ?? '';
    expect(deltaText).toMatch(/\+0\.7/);

    // Second floor lands — another height increase with different delta
    rerender(bar({ heightM: 4.6 }));
    delta = container.querySelector('[data-wt2-height-delta]');
    expect(delta).toBeTruthy();
    deltaText = delta!.textContent ?? '';
    expect(deltaText).toMatch(/\+0\.9/);
  });
});
