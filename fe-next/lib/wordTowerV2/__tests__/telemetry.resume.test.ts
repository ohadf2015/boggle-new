// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const captured: Array<[string, Record<string, unknown>]> = [];
vi.mock('@/lib/analytics/lazyPosthog', () => {
  const capture = (name: string, props: Record<string, unknown>) => { captured.push([name, props]); };
  return { default: new Proxy({ capture, captureBeacon: capture }, { get: (t, k) => (k in t ? t[k as keyof typeof t] : () => undefined) }) };
});

import { __resetAbandonStateForTests, installAbandonOnPagehide } from '@/utils/abandonOnPagehide';
import { endV2Run, setTowerStartExtras, startV2Run } from '../telemetry';

const names = () => captured.filter(([n]) => n.startsWith('growth:')).map(([n]) => n.slice(7));
const setHidden = (hidden: boolean) => {
  Object.defineProperty(document, 'visibilityState', { value: hidden ? 'hidden' : 'visible', configurable: true });
  document.dispatchEvent(new Event('visibilitychange'));
};

describe('word tower: a run hidden mid-climb and then finished', () => {
  let uninstall: () => void;
  beforeEach(() => {
    captured.length = 0;
    __resetAbandonStateForTests();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    uninstall = installAbandonOnPagehide();
    setTowerStartExtras({ v2: true, daily: false });
  });
  afterEach(() => { uninstall(); setHidden(false); vi.useRealTimers(); });

  it('given a hide mid-run, when the run resumes and ends, then the completion says it resumed so the hide abandon is dropped', () => {
    const clock = { current: null as number | null };
    startV2Run(clock);
    vi.setSystemTime(new Date('2026-01-01T00:09:00Z'));
    setHidden(true);
    setHidden(false);
    endV2Run(clock, { floors: 17, heightM: 50 });

    expect(names()).toEqual(expect.arrayContaining(['game_started', 'game_abandoned', 'game_completed']));
    const completed = captured.find(([n]) => n.endsWith('game_completed'))![1];
    expect(completed).toMatchObject({ mode: 'word-tower', resumed_after_hidden: true, floors: 17 });
  });

  it('given a second run on the same page, when it ends, then it is logged too', () => {
    const clock = { current: null as number | null };
    startV2Run(clock);
    endV2Run(clock, { floors: 3, heightM: 9 });
    startV2Run(clock);
    endV2Run(clock, { floors: 5, heightM: 15 });
    expect(names().filter((n) => n === 'game_completed')).toHaveLength(2);
  });
});
