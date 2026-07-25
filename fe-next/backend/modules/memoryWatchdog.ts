/**
 * Memory-pressure watchdog → Telegram ops alert BEFORE the container OOM-kills.
 *
 * Why: 2026-07-19 the server slow-leaked to the ~2560MB cgroup limit over ~15h
 * and the kernel SIGKILLed it silently (no JS exception, no Sentry). See memory
 * `railway-outage-boot-watchdog-2026-07-19`. This watchdog samples RSS and pings
 * Telegram once it crosses a threshold — so a human is warned while there's still
 * headroom to act, instead of finding out from a 53-min outage.
 *
 * Design:
 *  - Band model (ok / warn / critical) with hysteresis so a value hovering at the
 *    boundary can't flap-spam. Escalation alerts immediately; staying elevated
 *    re-alerts on a slow cadence; recovery only clears below a lower threshold.
 *  - The decision is a PURE function (evaluateMemoryAlert) — that's the tested
 *    core; the interval + Telegram send are thin glue.
 *
 * ponytail: RSS-vs-cgroup-limit heuristic, not a leak detector. It buys warning
 * time; the actual leak fix is separate. Thresholds env-tunable if they prove
 * too chatty/quiet.
 */
import fs from 'fs';
import v8 from 'v8';
import logger from '../utils/logger';
import { sendOpsAlert } from './notificationService';

export type MemBand = 'ok' | 'warn' | 'critical';

export interface MemWatchState {
  band: MemBand;
  lastAlertAt: number;
}

export interface MemAlertDecision {
  alert: boolean;
  level: 'warn' | 'critical' | 'recovered' | null;
  next: MemWatchState;
}

const WARN_PCT = Number(process.env.MEM_WARN_PCT || 0.8); // 80% of limit
const CRIT_PCT = Number(process.env.MEM_CRIT_PCT || 0.9); // 90% of limit
const RECOVER_PCT = 0.7; // must drop below this to clear (hysteresis)
const REALERT_MS = 10 * 60 * 1000; // re-nag cadence while still elevated

const RANK: Record<MemBand, number> = { ok: 0, warn: 1, critical: 2 };

/**
 * Pure decision: given prior state + current RSS/limit, decide whether to alert.
 * Never sends anything — returns the next state so the caller can persist it.
 */
export function evaluateMemoryAlert(
  prev: MemWatchState,
  rssBytes: number,
  limitBytes: number,
  now: number,
): MemAlertDecision {
  const pct = limitBytes > 0 ? rssBytes / limitBytes : 0;
  const curBand: MemBand = pct >= CRIT_PCT ? 'critical' : pct >= WARN_PCT ? 'warn' : 'ok';

  // Escalated into a higher band → alert now.
  if (RANK[curBand] > RANK[prev.band]) {
    return {
      alert: curBand !== 'ok',
      level: curBand === 'critical' ? 'critical' : 'warn',
      next: { band: curBand, lastAlertAt: now },
    };
  }

  // Still elevated in the same band → re-nag on cadence only.
  if (curBand !== 'ok' && RANK[curBand] === RANK[prev.band]) {
    if (now - prev.lastAlertAt >= REALERT_MS) {
      return {
        alert: true,
        level: curBand === 'critical' ? 'critical' : 'warn',
        next: { band: curBand, lastAlertAt: now },
      };
    }
    return { alert: false, level: null, next: prev };
  }

  // De-escalated. Only fully clear (and announce recovery) below RECOVER_PCT.
  if (RANK[curBand] < RANK[prev.band]) {
    if (curBand === 'ok') {
      if (pct >= RECOVER_PCT) return { alert: false, level: null, next: prev }; // hold — avoid flapping
      return { alert: true, level: 'recovered', next: { band: 'ok', lastAlertAt: now } };
    }
    // critical → warn: still elevated, already warned — just lower the band.
    return { alert: false, level: null, next: { band: curBand, lastAlertAt: prev.lastAlertAt } };
  }

  return { alert: false, level: null, next: prev };
}

/**
 * Best-effort container memory limit in bytes. Prefers the real cgroup limit
 * (what the kernel OOM-kills against), then MEMORY_LIMIT_MB, then a 2560MB
 * fallback (the observed Railway limit on 2026-07-19).
 */
export function getContainerMemoryLimitBytes(): number {
  const tryRead = (p: string): number | null => {
    try {
      const raw = fs.readFileSync(p, 'utf8').trim();
      if (raw === 'max') return null; // cgroup v2 unlimited
      const n = Number(raw);
      if (!Number.isFinite(n) || n <= 0) return null;
      if (n > 1024 ** 4) return null; // v1 "unlimited" sentinel (~8 EiB) → treat as unset
      return n;
    } catch {
      return null;
    }
  };
  const cg = tryRead('/sys/fs/cgroup/memory.max') ?? tryRead('/sys/fs/cgroup/memory/memory.limit_in_bytes');
  if (cg) return cg;
  const envMb = parseInt(process.env.MEMORY_LIMIT_MB || '', 10);
  if (Number.isFinite(envMb) && envMb > 0) return envMb * 1024 * 1024;
  return 2560 * 1024 * 1024;
}

function formatAlert(level: 'warn' | 'critical' | 'recovered', rssBytes: number, limitBytes: number): string {
  const rssMb = Math.round(rssBytes / 1024 / 1024);
  const limitMb = Math.round(limitBytes / 1024 / 1024);
  const pct = Math.round((rssBytes / limitBytes) * 100);
  const upMin = Math.round(process.uptime() / 60);
  const icon = level === 'critical' ? '🔴' : level === 'recovered' ? '🟢' : '🟠';
  const head =
    level === 'recovered'
      ? 'memory recovered'
      : level === 'critical'
        ? 'memory CRITICAL — OOM imminent'
        : 'memory high — approaching OOM';
  return `${icon} lexiclash boggle-new: ${head}\nRSS ${rssMb}MB / ${limitMb}MB (${pct}%) · uptime ${upMin}m`;
}

let timer: NodeJS.Timeout | undefined;

/**
 * Start sampling RSS on an interval and alert on band transitions. Idempotent-ish:
 * a prior timer is cleared first. Returns a stop function.
 */
export function startMemoryWatchdog(
  opts: { intervalMs?: number; limitBytes?: number; send?: (m: string) => void | Promise<void> } = {},
): () => void {
  if (timer) clearInterval(timer);
  const intervalMs = opts.intervalMs ?? 30_000;
  const limitBytes = opts.limitBytes ?? getContainerMemoryLimitBytes();
  const send = opts.send ?? sendOpsAlert;
  let state: MemWatchState = { band: 'ok', lastAlertAt: 0 };
  let samples = 0;

  logger.info('MEMWATCH', `Memory watchdog started: limit ${Math.round(limitBytes / 1024 / 1024)}MB, every ${intervalMs}ms`);

  timer = setInterval(() => {
    const mu = process.memoryUsage();
    const decision = evaluateMemoryAlert(state, mu.rss, limitBytes, Date.now());
    state = decision.next;
    if (decision.alert && decision.level) {
      void send(formatAlert(decision.level, mu.rss, limitBytes));
    }

    // Leak forensics: full memory breakdown every ~5 min (10 × 30s samples).
    // rss vs heapUsed vs external/arrayBuffers tells us whether growth lives in
    // the V8 heap (object retention) or outside it (buffers/native/TLS/zlib) —
    // the two classes need completely different fixes.
    samples += 1;
    if (samples % 10 === 0) {
      const hs = v8.getHeapStatistics();
      const mb = (n: number) => Math.round(n / 1024 / 1024);
      logger.info(
        'MEMWATCH',
        `diag rss=${mb(mu.rss)}MB heapUsed=${mb(mu.heapUsed)}/${mb(mu.heapTotal)}MB ` +
          `external=${mb(mu.external)}MB arrayBuffers=${mb(mu.arrayBuffers ?? 0)}MB ` +
          `heapLimit=${mb(hs.heap_size_limit)}MB malloced=${mb(hs.malloced_memory)}MB ` +
          `uptime=${Math.round(process.uptime() / 60)}m`,
      );
    }
  }, intervalMs);
  if (timer.unref) timer.unref(); // never keep the process alive for the watchdog

  return () => {
    if (timer) clearInterval(timer);
    timer = undefined;
  };
}
