/**
 * Adaptive FX budget. Every Blast burst asks the governor how much it may
 * spend; the governor watches real frame times and sheds quality when the
 * rolling p95 goes over budget (fast), and earns it back only after seconds
 * of smooth frames (slow), so quality never oscillates mid-combo.
 */

export type FxQuality = 0 | 1 | 2;
export type FxWorkKind = 'core' | 'extra' | 'ambient';

const QUALITY_SCALE: Record<FxQuality, number> = { 0: 0.35, 1: 0.65, 2: 1 };
const WINDOW = 60;
const MIN_SAMPLES = 30;
const DEGRADE_P95_MS = 20;
const RECOVER_P95_MS = 17.5;
const RECOVER_AFTER_MS = 4000;
const IGNORE_GAP_MS = 250;

export interface FxGovernor {
  readonly quality: FxQuality;
  sample(dtMs: number): void;
  scale(count: number): number;
  allows(kind: FxWorkKind): boolean;
  setMaxQuality(q: FxQuality): void;
  reset(): void;
}

export function startQualityFor(device: { isLowEnd: boolean; isMobile: boolean }): FxQuality {
  if (device.isLowEnd) return 0;
  return device.isMobile ? 1 : 2;
}

function p95(buf: number[]): number {
  const s = [...buf].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(0.95 * s.length))];
}

export function createFxGovernor(opts: { maxQuality: FxQuality }): FxGovernor {
  let maxQuality = opts.maxQuality;
  let quality: FxQuality = maxQuality;
  let buf: number[] = [];
  let smoothMs = 0;
  let sinceEval = 0;
  let evalSpanMs = 0;

  return {
    get quality() {
      return quality;
    },
    sample(dtMs) {
      if (!(dtMs > 0) || dtMs > IGNORE_GAP_MS) return;
      buf.push(dtMs);
      if (buf.length > WINDOW) buf.shift();
      sinceEval++;
      evalSpanMs += dtMs;
      // p95 is only re-evaluated every 10 frames to keep the per-frame cost flat.
      if (buf.length < MIN_SAMPLES || sinceEval < 10) return;
      const span = evalSpanMs;
      sinceEval = 0;
      evalSpanMs = 0;
      const p = p95(buf);
      if (p > DEGRADE_P95_MS) {
        if (quality > 0) quality = (quality - 1) as FxQuality;
        buf = [];
        smoothMs = 0;
        return;
      }
      if (p < RECOVER_P95_MS && quality < maxQuality) {
        smoothMs += span;
        if (smoothMs >= RECOVER_AFTER_MS) {
          quality = (quality + 1) as FxQuality;
          smoothMs = 0;
        }
      } else {
        smoothMs = 0;
      }
    },
    scale(count) {
      return Math.max(1, Math.round(count * QUALITY_SCALE[quality]));
    },
    allows(kind) {
      return kind === 'core' || quality >= 1;
    },
    setMaxQuality(q) {
      maxQuality = q;
      if (quality > q) quality = q;
    },
    reset() {
      quality = maxQuality;
      buf = [];
      smoothMs = 0;
      sinceEval = 0;
      evalSpanMs = 0;
    },
  };
}
