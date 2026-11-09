'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { EduMascot } from '@/components/education/EduMascot';
import { NB_BLOCK, NB_PANEL } from '../nb/nbStyles';
import { NeoPanel } from '@/components/ui/panel';

type T = (key: string, params?: Record<string, string | number>) => string;

/** Wide-screen rail card: a private practice round before the real one, so the teacher knows what the class will see. */
export function HomePracticeCard({ action, t }: { action: ReactNode; t: T }) {
  return (
    <NeoPanel asChild tone="cyan" radius="neo-xl" shadow="xl" className="flex flex-col gap-2 p-4">
    <section data-testid="home-practice-card" aria-labelledby="home-practice-title">
      <div className="flex items-start gap-3">
        <EduMascot moment="tip" size={64} className="size-16 shrink-0 drop-shadow-[3px_3px_0_rgb(var(--neo-black))]" />
        <div className="min-w-0">
          <h2 id="home-practice-title" className="font-neo-display text-lg font-black leading-tight">{t('eduShell.home.practice.title')}</h2>
          <p className="mt-1 font-neo-body text-sm font-semibold leading-snug text-neo-black/80">{t('eduShell.home.practice.body')}</p>
        </div>
      </div>
      {action}
    </section>
    </NeoPanel>
  );
}

export default HomePracticeCard;
