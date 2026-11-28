import styles from './holidayDaily.module.css';

export type BurstKind = 'coin' | 'ribbon' | 'confetti';

const COLORS = ['var(--neo-holiday-red)', 'var(--neo-holiday-blue)', 'var(--neo-holiday-pine)', 'var(--neo-holiday-snow)'];

export function reducedMotion(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

export function spawnBurst(layer: HTMLElement | null, x: number, y: number, kind: BurstKind, count = 10): void {
  if (!layer || reducedMotion()) return;
  for (let i = 0; i < count; i++) {
    const el = document.createElement('span');
    el.className = styles[kind];
    el.setAttribute('aria-hidden', 'true');
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.6;
    const dist = 40 + Math.random() * (kind === 'confetti' ? 110 : 60);
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.style.setProperty('--dx', `${Math.cos(angle) * dist}px`);
    el.style.setProperty('--dy', `${Math.sin(angle) * dist + (kind === 'coin' ? 30 : 60)}px`);
    el.style.setProperty('--rot', `${Math.round(Math.random() * 540 - 270)}deg`);
    if (kind === 'confetti') el.style.background = COLORS[i % COLORS.length];
    el.addEventListener('animationend', () => el.remove(), { once: true });
    layer.appendChild(el);
    window.setTimeout(() => el.remove(), 1600);
  }
}

export function flashAt(layer: HTMLElement | null, rect: { left: number; top: number; width: number; height: number }): void {
  if (!layer || reducedMotion()) return;
  const el = document.createElement('span');
  el.className = styles.tileFlash;
  el.setAttribute('aria-hidden', 'true');
  Object.assign(el.style, { left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px` });
  el.addEventListener('animationend', () => el.remove(), { once: true });
  layer.appendChild(el);
  window.setTimeout(() => el.remove(), 900);
}
