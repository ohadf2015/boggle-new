const INTRO_MS = 1000;
const AUTO_CONTINUE_MS = 6000;

// Dev-only stretch so the 1s splash and the countdown can be inspected and screenshotted.
function devOverride(param: string): number | null {
  if (process.env.NODE_ENV === 'production' || typeof window === 'undefined') return null;
  const raw = new URLSearchParams(window.location.search).get(param);
  const n = raw ? Number(raw) : NaN;
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function introDurationMs(): number {
  return devOverride('blastIntroMs') ?? INTRO_MS;
}

export function autoContinueMs(): number {
  return devOverride('blastContinueMs') ?? AUTO_CONTINUE_MS;
}
