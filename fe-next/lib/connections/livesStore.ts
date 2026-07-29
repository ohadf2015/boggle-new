import type { PuzzleLocale } from './types';
import { INITIAL_LIVES } from './gameLogic';

export const MAX_LIVES = INITIAL_LIVES;

export const LIVES_STORAGE_KEY = (locale: string): string => `connections:lives:${locale}`;

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function clamp(n: number): number {
  if (!Number.isFinite(n)) return MAX_LIVES;
  return Math.max(0, Math.min(MAX_LIVES, Math.floor(n)));
}

export function getCurrentLives(locale: PuzzleLocale | string): number {
  if (!isBrowser()) return MAX_LIVES;
  const raw = window.localStorage.getItem(LIVES_STORAGE_KEY(locale));
  if (raw === null) return MAX_LIVES;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n)) return MAX_LIVES;
  return clamp(n);
}

export function setCurrentLives(locale: PuzzleLocale | string, lives: number): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(LIVES_STORAGE_KEY(locale), String(clamp(lives)));
}

export function resetLives(locale: PuzzleLocale | string): void {
  if (!isBrowser()) return;
  window.localStorage.removeItem(LIVES_STORAGE_KEY(locale));
}
