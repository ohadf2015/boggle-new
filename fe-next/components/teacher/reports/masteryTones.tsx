'use client';

import { Check, Dot, Minus, X, type LucideIcon } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import type { CellTone } from './masteryHeatmapView';

export const TONES: CellTone[] = ['missed', 'shaky', 'solid', 'unseen'];

export const TONE_CLASS: Record<CellTone, string> = {
  solid: 'border-black bg-neo-lime text-neo-black',
  shaky: 'border-black bg-neo-cyan text-neo-black',
  missed: 'border-black bg-neo-pink text-neo-black',
  unseen: 'border-neo-cream/40 bg-neo-white/5 text-neo-cream/50',
};

export const TONE_ICON: Record<CellTone, LucideIcon> = { solid: Check, shaky: Minus, missed: X, unseen: Dot };

export function ToneIcon({ tone, className }: { tone: CellTone; className?: string }) {
  const Icon = TONE_ICON[tone];
  return <Icon aria-hidden="true" strokeWidth={3.5} className={cn('size-4', className)} />;
}

export function MasteryLegend() {
  const { t } = useLanguage();
  return (
    <p data-testid="mastery-legend" className="flex flex-wrap gap-x-3 gap-y-1.5 text-xs font-bold text-neo-cream/85">
      {TONES.map((tone) => (
        <span key={tone} className={cn('items-center gap-1.5', tone === 'unseen' ? 'hidden sm:inline-flex' : 'inline-flex')}>
          <span aria-hidden="true" className={cn('grid size-5 place-items-center rounded-[4px] border-2', TONE_CLASS[tone])}>
            <ToneIcon tone={tone} className="size-3" />
          </span>
          {t(`eduPro.mastery.legend.${tone}`)}
        </span>
      ))}
    </p>
  );
}
