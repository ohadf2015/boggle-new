export interface ProbeResult {
  reachable: boolean;
  rttMs: number | null;
}

interface ProbeOptions {
  url?: string;
  timeoutMs?: number;
}

const DEFAULT_PROBE_URL = '/api/ping';
const DEFAULT_TIMEOUT_MS = 3000;

export async function probeReachability(options: ProbeOptions = {}): Promise<ProbeResult> {
  const url = options.url ?? DEFAULT_PROBE_URL;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const start = performance.now();
  try {
    const res = await fetch(url, {
      method: 'HEAD',
      cache: 'no-store',
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok && res.status !== 204) return { reachable: false, rttMs: null };
    const rttMs = Math.round(performance.now() - start);
    return { reachable: true, rttMs };
  } catch {
    clearTimeout(timer);
    return { reachable: false, rttMs: null };
  }
}

const SLOW_RTT_THRESHOLD_MS = 2000;

export function classifySlowFromRtt(rttMs: number | null): boolean {
  if (rttMs === null) return false;
  return rttMs > SLOW_RTT_THRESHOLD_MS;
}
