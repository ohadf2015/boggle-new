/** The server always spends a freeze on yesterday (UTC), which is also the date the home moment keys on. */
export function bridgedDay(now: Date = new Date()): string {
  const d = new Date(now);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

