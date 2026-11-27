export function neoColor(token: string, fallback = 0xffffff): number {
  if (typeof document === 'undefined') return fallback;
  const raw = getComputedStyle(document.documentElement).getPropertyValue(`--${token}`).trim();
  if (/^#[0-9a-f]{6}$/i.test(raw)) return parseInt(raw.slice(1), 16);
  const rgb = raw.split(/[\s,]+/).map(Number);
  if (rgb.length === 3 && rgb.every((n) => Number.isFinite(n))) return (rgb[0] << 16) | (rgb[1] << 8) | rgb[2];
  return fallback;
}

export const neoHex = (token: string, fallback = 0xffffff) => neoColor(token, fallback).toString(16).padStart(6, '0');
