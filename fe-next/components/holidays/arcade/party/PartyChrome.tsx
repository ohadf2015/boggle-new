'use client';

import { QRCodeSVG } from 'qrcode.react';
import { ArrowLeft, Maximize2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import styles from '../arcade.module.css';

export const TV_BTN = 'grid place-items-center rounded-[0.45em] border-[0.12em] border-black shadow-hard active:translate-y-0.5';

interface HeaderProps {
  title: string;
  code: string | null;
  codeLabel: string;
  backLabel: string;
  fullLabel: string;
  stripe: string;
  bulbs: readonly string[];
  onExit: () => void;
}

export function goFullscreen() {
  try {
    void document.documentElement.requestFullscreen?.();
  } catch {
    // a TV browser without fullscreen keeps the page edge to edge
  }
}

export function PartyHeader({ title, code, codeLabel, backLabel, fullLabel, stripe, bulbs, onExit }: HeaderProps) {
  return (
    <header className="relative z-20 mx-[1.5cqw] mt-[1.5cqh] overflow-hidden rounded-[1.6cqh] border-[0.4cqh] border-black bg-neo-navy-light shadow-hard-lg">
      <div className={cn('h-[0.8cqh]', stripe)} aria-hidden="true" />
      <div className={cn(styles.lights, 'absolute inset-x-[2cqw] top-[1.4cqh]')} aria-hidden="true">
        {Array.from({ length: 22 }, (_, i) => (
          <span key={i} className={cn(styles.bulb, bulbs[i % bulbs.length])} />
        ))}
      </div>
      <div className="flex items-center gap-[1.2cqw] px-[1.2cqw] pb-[1.2cqh] pt-[2.4cqh] text-[3.4cqh]">
        <button type="button" onClick={onExit} aria-label={backLabel} className={cn(TV_BTN, 'size-[1.9em] bg-neo-cream text-neo-navy')}>
          <ArrowLeft className="size-[0.9em] rtl:rotate-180" aria-hidden="true" />
        </button>
        <h1 className="min-w-0 flex-1 truncate font-neo-display text-[4.6cqh] font-black leading-none text-neo-white">{title}</h1>
        {code && (
          <p className="flex items-center gap-[0.4em] font-neo-display font-black text-neo-white/80">
            <span className="text-[2.6cqh] uppercase tracking-wide">{codeLabel}</span>
            <span data-testid="party-code" dir="ltr" className="rounded-[0.35em] border-[0.1em] border-black bg-[var(--arcade-accent)] text-neo-white px-[0.45em] text-[4.6cqh] tracking-[0.18em] shadow-hard">
              {code}
            </span>
          </p>
        )}
        <button type="button" onClick={goFullscreen} aria-label={fullLabel} className={cn(TV_BTN, 'size-[1.9em] bg-neo-navy text-neo-white')}>
          <Maximize2 className="size-[0.9em]" aria-hidden="true" />
        </button>
      </div>
    </header>
  );
}

export function JoinCorner({ url }: { url: string }) {
  if (!url) return null;
  return (
    <aside className="absolute bottom-[1.5cqh] start-[1.5cqw] z-20 rounded-[1.2cqh] border-[0.35cqh] border-black bg-neo-cream p-[0.7cqh] opacity-90 shadow-hard-lg">
      <QRCodeSVG value={url} className="size-[7cqh]" level="M" />
    </aside>
  );
}
