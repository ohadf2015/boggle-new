'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { KeyRound } from 'lucide-react';
import posthog from '@/lib/analytics/lazyPosthog';
import { useLanguage } from '@/contexts/LanguageContext';
import { JoinCodeField, JOIN_CODE_LENGTH, sanitizeJoinCode } from '@/components/education/join/JoinCodeField';
import { JoinPrimaryButton } from '@/components/education/join/JoinPrimaryButton';
import { cn } from '@/lib/utils';

/** A student with no class has one job: type the code. Six characters take them to the class. */
export function NoClassPanel({ className }: { className?: string }) {
  const { t, language } = useLanguage();
  const router = useRouter();
  const [code, setCode] = useState('');
  const [short, setShort] = useState(false);

  const go = (next: string) => {
    const clean = sanitizeJoinCode(next);
    if (clean.length !== JOIN_CODE_LENGTH) { setShort(true); return; }
    posthog.capture('student_academy_cta_clicked', { kind: 'join-class' });
    router.push(`/${language}/join/${clean}`);
  };

  return (
    <form
      data-testid="academy-no-class"
      onSubmit={(e) => { e.preventDefault(); go(code); }}
      className={cn('pointer-events-auto mx-auto flex w-full max-w-md flex-col gap-4 rounded-neo border-3 border-neo-cream bg-neo-navy p-5 text-neo-white shadow-hard-lg', className)}
    >
      <div className="flex items-center gap-3">
        <span aria-hidden="true" className="flex size-12 shrink-0 items-center justify-center rounded-neo border-3 border-neo-black bg-neo-cyan text-neo-black shadow-hard-sm">
          <KeyRound className="size-6" strokeWidth={2.75} />
        </span>
        <div className="min-w-0">
          <h1 className="font-neo-display text-2xl font-black uppercase leading-none tracking-tight wrap-break-word sm:text-3xl">
            {t('academy.student.noClass.title', 'Enter your class code')}
          </h1>
          <p className="mt-1 font-neo-body text-sm font-bold text-neo-cyan">{t('education.student.join.flow.codeSub')}</p>
        </div>
      </div>
      <JoinCodeField
        value={code}
        onChange={(next) => { setCode(sanitizeJoinCode(next)); setShort(false); }}
        onComplete={go}
        label={t('education.student.join.codeLabel')}
        invalid={short}
      />
      <JoinPrimaryButton>{t('education.student.join.flow.next')}</JoinPrimaryButton>
    </form>
  );
}
