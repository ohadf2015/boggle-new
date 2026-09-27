export type RampConfig = {
  approachMs: number;
  dwellMs: number;
  followThroughMs: number;
  startRate: number;
  peakRate: number;
  endRate: number;
};

export const RAMP_DEFAULTS: RampConfig = {
  approachMs: 400,
  dwellMs: 400,
  followThroughMs: 600,
  startRate: 1.0,
  peakRate: 0.2,
  endRate: 1.5,
};

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function rampRate(elapsedMs: number, config: RampConfig): number {
  if (elapsedMs <= 0) return config.startRate;
  const peakStart = config.approachMs;
  const dwellEnd = peakStart + config.dwellMs;
  const totalEnd = dwellEnd + config.followThroughMs;

  if (elapsedMs < peakStart) {
    const t = elapsedMs / config.approachMs;
    return config.startRate + (config.peakRate - config.startRate) * easeInOutCubic(t);
  }
  if (elapsedMs <= dwellEnd) return config.peakRate;
  if (elapsedMs >= totalEnd) return config.endRate;
  const t = (elapsedMs - dwellEnd) / config.followThroughMs;
  return config.peakRate + (config.endRate - config.peakRate) * easeInOutCubic(t);
}
