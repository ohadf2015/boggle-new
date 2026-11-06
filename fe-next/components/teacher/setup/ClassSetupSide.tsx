'use client';

import { cn } from '@/lib/utils';
import { EduMascot } from '@/components/education/EduMascot';
import { NB_BLOCK, NB_PANEL } from '../nb/nbStyles';

type T = (key: string, params?: Record<string, string | number>) => string;

const STEPS = [
  { key: 'step1', color: NB_BLOCK.lime },
  { key: 'step2', color: NB_BLOCK.cyan },
  { key: 'step3', color: NB_BLOCK.yellow },
] as const;

/** Wide screens only: the big mascot and what happens after "Create", so the form never floats alone in empty space. */
export function ClassSetupSide({ t }: { t: T }) {
  return (
    <aside data-testid="setup-side" className={cn(NB_PANEL, NB_BLOCK.purple, 'hidden flex-col gap-4 p-6 lg:flex')}>
      <EduMascot moment="firstClass" size={220} className="mx-auto size-48 drop-shadow-[5px_5px_0_rgb(var(--neo-black))] xl:size-56" />
      <h2 className="font-neo-display text-3xl font-black leading-tight">{t('eduShell.setup.side.title')}</h2>
      <ol className="flex flex-col gap-3">
        {STEPS.map(({ key, color }, i) => (
          <li key={key} className="flex items-center gap-3">
            <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-neo-lg border-[3px] border-neo-black font-neo-display text-xl font-black shadow-hard-lg', color)}>
              {i + 1}
            </span>
            <span className="font-neo-body text-base font-bold leading-snug">{t(`eduShell.setup.side.${key}`)}</span>
          </li>
        ))}
      </ol>
    </aside>
  );
}

export default ClassSetupSide;
