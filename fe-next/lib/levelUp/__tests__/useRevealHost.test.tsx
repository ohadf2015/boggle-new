import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { useEffect } from 'react';

vi.mock('@/utils/growthTracking', () => ({ trackGrowthEvent: vi.fn() }));

import { useRevealHost } from '../useRevealHost';
import { announceLevelUp, hasRevealHost, settleLevelUp, __resetLevelUpBusForTests } from '../levelUpBus';

function Host() {
  useRevealHost();
  return null;
}

function Watcher({ onSettled }: { onSettled: (d: ReturnType<typeof settleLevelUp>) => void }) {
  useEffect(() => { onSettled(settleLevelUp()); }, [onSettled]);
  return null;
}

describe('useRevealHost', () => {
  beforeEach(() => __resetLevelUpBusForTests());

  it('registers while mounted and releases on unmount', () => {
    const { unmount } = render(<Host />);
    expect(hasRevealHost()).toBe(true);
    unmount();
    expect(hasRevealHost()).toBe(false);
  });

  it('Given a watcher rendered BEFORE its host in the same commit, Then the host is already counted when it settles', () => {
    announceLevelUp({ oldLevel: 1, newLevel: 2 }, 'single');
    const onSettled = vi.fn();
    render(<><Watcher onSettled={onSettled} /><Host /></>);
    expect(onSettled).toHaveBeenCalledWith('reveal');
  });
});
