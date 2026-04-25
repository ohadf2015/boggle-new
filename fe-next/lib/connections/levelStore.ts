import type { PuzzleLocale } from './types';

export const LEVEL_STORAGE_KEY = (locale: string): string => `connections:level:${locale}`;

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function getCurrentLevel(locale: PuzzleLocale | string): number {
  if (!isBrowser()) return 1;
  const raw = window.localStorage.getItem(LEVEL_STORAGE_KEY(locale));
  if (!raw) return 1;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1) return 1;
  return n;
}

export function setCurrentLevel(locale: PuzzleLocale | string, level: number): void {
  if (!isBrowser()) return;
  const clamped = Math.max(1, Math.floor(level));
  window.localStorage.setItem(LEVEL_STORAGE_KEY(locale), String(clamped));
}

export function resetLevel(locale: PuzzleLocale | string): void {
  if (!isBrowser()) return;
  window.localStorage.removeItem(LEVEL_STORAGE_KEY(locale));
}
