// Polar sends created, active, updated and checkout.updated for one trial within seconds;
// in-process memory is enough because the webhook runs on a single instance.
const TTL_MS = 60 * 60 * 1000;
const seen = new Map<string, number>();

/** True the first time `key` is seen within the TTL, false for every repeat. */
export function firstWebhookTelemetry(key: string, now: number = Date.now()): boolean {
  for (const [k, at] of seen) if (now - at > TTL_MS) seen.delete(k);
  if (seen.has(key)) return false;
  seen.set(key, now);
  return true;
}

export function resetWebhookTelemetryOnce(): void {
  seen.clear();
}
