'use client';

import { UserCheck, UserX } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { NEO_BUTTON } from '@/components/ui/neoStyles';
import { JoinAlert } from './JoinAlert';
import { JoinPrimaryButton } from './JoinPrimaryButton';

const K = 'education.student.join';

interface JoinReturningStepProps {
  name: string;
  leaving: boolean;
  leaveFailed: boolean;
  onYes: () => void;
  onNotMe: () => void;
}

export function JoinReturningStep({ name, leaving, leaveFailed, onYes, onNotMe }: JoinReturningStepProps) {
  const { t } = useLanguage();
  return (
    <section data-testid="join-returning-step" aria-labelledby="join-returning-title" className="flex flex-col gap-5 short:gap-3">
      <div>
        <h1
          id="join-returning-title"
          className="font-neo-display text-4xl font-black uppercase leading-[0.95] tracking-tight text-neo-white short:text-3xl sm:text-5xl lg:text-6xl"
        >
          {name ? t(`${K}.returning.title`, { name }) : t(`${K}.returning.titleNoName`)}
        </h1>
        <p className="mt-2 font-neo-body text-base font-bold text-neo-cyan short:mt-1 short:text-sm lg:text-lg">
          {t(`${K}.returning.sub`)}
        </p>
      </div>
      <div className="flex flex-col gap-3">
        <JoinPrimaryButton type="button" onClick={onYes} disabled={leaving} autoFocus>
          <UserCheck aria-hidden="true" className="size-6" strokeWidth={2.75} />
          {t(`${K}.returning.yes`)}
        </JoinPrimaryButton>
        <button
          type="button"
          onClick={onNotMe}
          disabled={leaving}
          aria-busy={leaving || undefined}
          className={cn(NEO_BUTTON.secondary, 'w-full min-h-14 text-lg disabled:cursor-wait disabled:opacity-60')}
        >
          <UserX aria-hidden="true" className="size-5" />
          {leaving ? t(`${K}.returning.leaving`) : t(`${K}.returning.notMe`)}
        </button>
        {leaveFailed && <JoinAlert>{t(`${K}.returning.leaveFailed`)}</JoinAlert>}
      </div>
    </section>
  );
}
