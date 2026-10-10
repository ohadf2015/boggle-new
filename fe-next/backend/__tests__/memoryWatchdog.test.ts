/**
 * Memory watchdog tests — the pure alert-decision logic (band model + hysteresis)
 * that decides when to fire a Telegram ops alert before an OOM-kill.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';

vi.mock('../utils/logger', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));
vi.mock('../modules/notificationService', () => ({ sendOpsAlert: vi.fn() }));

import {
  evaluateMemoryAlert,
  evaluateDualMemoryAlert,
  getContainerMemoryLimitBytes,
  evaluateHeapCapVsContainer,
  heapPressureBytes,
  type MemWatchState,
  type DualMemWatchState,
} from '../modules/memoryWatchdog';

const MB = 1024 * 1024;

const LIMIT = 1000; // bytes → pct = rss / 1000, keeps the math obvious
const ok = (): MemWatchState => ({ band: 'ok', lastAlertAt: 0 });

describe('evaluateMemoryAlert', () => {
  it('stays quiet below the warn threshold', () => {
    const d = evaluateMemoryAlert(ok(), 750, LIMIT, 1000); // 75%
    expect(d.alert).toBe(false);
    expect(d.next.band).toBe('ok');
  });

  it('alerts (warn) when crossing 80%', () => {
    const d = evaluateMemoryAlert(ok(), 850, LIMIT, 1000); // 85%
    expect(d.alert).toBe(true);
    expect(d.level).toBe('warn');
    expect(d.next.band).toBe('warn');
  });

  it('escalates to critical at 90%', () => {
    const prev: MemWatchState = { band: 'warn', lastAlertAt: 1000 };
    const d = evaluateMemoryAlert(prev, 950, LIMIT, 2000); // 95%
    expect(d.alert).toBe(true);
    expect(d.level).toBe('critical');
    expect(d.next.band).toBe('critical');
  });

  it('does NOT re-alert while staying in the same band within the cadence', () => {
    const prev: MemWatchState = { band: 'critical', lastAlertAt: 100_000 };
    const d = evaluateMemoryAlert(prev, 960, LIMIT, 100_000 + 60_000); // +1min < 10min
    expect(d.alert).toBe(false);
    expect(d.next).toBe(prev);
  });

  it('re-alerts once the cadence elapses while still elevated', () => {
    const prev: MemWatchState = { band: 'critical', lastAlertAt: 100_000 };
    const d = evaluateMemoryAlert(prev, 960, LIMIT, 100_000 + 11 * 60_000); // +11min > 10min
    expect(d.alert).toBe(true);
    expect(d.level).toBe('critical');
    expect(d.next.lastAlertAt).toBe(100_000 + 11 * 60_000);
  });

  it('drops critical→warn silently (already warned, still elevated)', () => {
    const prev: MemWatchState = { band: 'critical', lastAlertAt: 5000 };
    const d = evaluateMemoryAlert(prev, 850, LIMIT, 6000); // 85% = warn band
    expect(d.alert).toBe(false);
    expect(d.next.band).toBe('warn');
  });

  it('holds (no clear) between recover and warn thresholds — hysteresis, no flap', () => {
    const prev: MemWatchState = { band: 'warn', lastAlertAt: 5000 };
    const d = evaluateMemoryAlert(prev, 750, LIMIT, 6000); // 75%: below warn(80) but above recover(70)
    expect(d.alert).toBe(false);
    expect(d.next.band).toBe('warn'); // held, not cleared
  });

  it('announces recovery only after dropping below the recover threshold', () => {
    const prev: MemWatchState = { band: 'warn', lastAlertAt: 5000 };
    const d = evaluateMemoryAlert(prev, 650, LIMIT, 6000); // 65% < 70%
    expect(d.alert).toBe(true);
    expect(d.level).toBe('recovered');
    expect(d.next.band).toBe('ok');
  });

  it('treats a zero/absent limit as non-alerting (no divide-by-zero storm)', () => {
    const d = evaluateMemoryAlert(ok(), 5_000_000, 0, 1000);
    expect(d.alert).toBe(false);
  });
});

describe('getContainerMemoryLimitBytes', () => {
  const orig = process.env.MEMORY_LIMIT_MB;
  afterEach(() => {
    if (orig === undefined) delete process.env.MEMORY_LIMIT_MB;
    else process.env.MEMORY_LIMIT_MB = orig;
  });

  it('falls back to MEMORY_LIMIT_MB when no cgroup file is readable', () => {
    // On CI/mac there is no /sys/fs/cgroup memory file → env fallback path.
    process.env.MEMORY_LIMIT_MB = '4096';
    const bytes = getContainerMemoryLimitBytes();
    // Either the real cgroup limit (Linux CI) or our env fallback — both are a
    // sane positive byte count well under the 1TiB unlimited sentinel.
    expect(bytes).toBeGreaterThan(0);
    expect(bytes).toBeLessThan(1024 ** 4);
  });
});

describe('evaluateHeapCapVsContainer', () => {
  it('flags UNSAFE when the heap cap exceeds 80% of the container (the 2026-07-29 misconfig)', () => {
    // --max-old-space-size=2048 on a 2384MiB container = 86% → RSS rides to ~98% → cgroup SIGKILL risk.
    const r = evaluateHeapCapVsContainer(2048 * MB, 2384 * MB);
    expect(r.safe).toBe(false);
    expect(r.heapPct).toBeCloseTo(0.86, 2);
    expect(r.message).toMatch(/heap cap/i);
  });

  it('is SAFE at the right-sized cap', () => {
    // 1536 / 2384 = 64%, leaving room for ~280MB non-heap RSS under the 80% watchdog WARN.
    const r = evaluateHeapCapVsContainer(1536 * MB, 2384 * MB);
    expect(r.safe).toBe(true);
    expect(r.heapPct).toBeCloseTo(0.64, 2);
  });

  it('treats an unknown (0) container limit as safe — never false-alarm at boot', () => {
    const r = evaluateHeapCapVsContainer(2048 * MB, 0);
    expect(r.safe).toBe(true);
  });
});

describe('evaluateDualMemoryAlert', () => {
  const dualOk = (): DualMemWatchState => ({
    rss: { band: 'ok', lastAlertAt: 0 },
    heap: { band: 'ok', lastAlertAt: 0 },
  });

  it('alerts on V8 heap 85% even when RSS is well under the cgroup 80% line', () => {
    // Prod 2026-10-07: heapLimit 1584MB killed the process at rss≈1.7GB, before
    // the 1907MB (80% of 2384MB) RSS watchdog could fire.
    const d = evaluateDualMemoryAlert(
      dualOk(),
      0.5 * 2384 * MB, // RSS 50% of cgroup
      2384 * MB,
      0.85 * 1584 * MB, // heap 85% of V8 cap
      1584 * MB,
      1000,
    );
    expect(d.rss.alert).toBe(false);
    expect(d.heap.alert).toBe(true);
    expect(d.heap.level).toBe('warn');
  });

  it('still alerts on RSS 80% when the heap is quiet', () => {
    const d = evaluateDualMemoryAlert(
      dualOk(),
      0.85 * 2384 * MB,
      2384 * MB,
      0.4 * 1584 * MB,
      1584 * MB,
      1000,
    );
    expect(d.rss.alert).toBe(true);
    expect(d.rss.level).toBe('warn');
    expect(d.heap.alert).toBe(false);
  });

  it('alerts on heapTotal 85% even when heapUsed is only 71% (the 2026-10-09 fatal)', () => {
    // Prod 2026-10-09: heapUsed 1119/1584 ≈ 71% (below WARN 80%) while
    // heapTotal 1343/1584 ≈ 85% — V8 then fataled. Old watchdog keyed only
    // on heapUsed and stayed silent.
    const d = evaluateDualMemoryAlert(
      dualOk(),
      0.5 * 2384 * MB,
      2384 * MB,
      0.71 * 1584 * MB,
      1584 * MB,
      1000,
      0.85 * 1584 * MB,
    );
    expect(d.rss.alert).toBe(false);
    expect(d.heap.alert).toBe(true);
    expect(d.heap.level).toBe('warn');
  });

  it('heapPressureBytes is max(used, total)', () => {
    expect(heapPressureBytes(100, 200)).toBe(200);
    expect(heapPressureBytes(200, 100)).toBe(200);
  });
});
