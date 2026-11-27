export const SNOWGLOBE_EVENT = 'lc:holiday-snowglobe';
export const SNOWBALL_EVENT = 'lc:holiday-snowball';

export function emitHolidayFx(name: string): void {
  window.dispatchEvent(new Event(name));
}

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}
