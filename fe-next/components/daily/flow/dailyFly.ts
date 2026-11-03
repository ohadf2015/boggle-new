const KEY = 'lc:daily-fly';
export const FLY_TTL_MS = 30_000;

export interface FlySource { cx: number; cy: number; size: number }

/** Remember where the tapped next-quest art sat so the arrival card can fly it in from there. */
export function saveFlySource(rect: DOMRect, now: number = Date.now()): void {
  const source: FlySource = { cx: rect.left + rect.width / 2, cy: rect.top + rect.height / 2, size: rect.width };
  try { sessionStorage.setItem(KEY, JSON.stringify({ ...source, at: now })); } catch { /* storage off */ }
}

/** One-shot: any read drops the marker. */
export function takeFlySource(now: number = Date.now()): FlySource | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (raw == null) return null;
    sessionStorage.removeItem(KEY);
    const { cx, cy, size, at } = JSON.parse(raw) as Record<string, unknown>;
    if (![cx, cy, size, at].every((n) => typeof n === 'number') || now - (at as number) > FLY_TTL_MS || now < (at as number)) return null;
    return { cx: cx as number, cy: cy as number, size: size as number };
  } catch {
    return null;
  }
}

export function flyKeyframes(from: FlySource, rest: DOMRect): [Keyframe, Keyframe] {
  const dx = from.cx - (rest.left + rest.width / 2);
  const dy = from.cy - (rest.top + rest.height / 2);
  return [
    { transform: `translate(${dx}px, ${dy}px) scale(${from.size / rest.width})` },
    { transform: 'translate(0px, 0px) scale(1)' },
  ];
}
