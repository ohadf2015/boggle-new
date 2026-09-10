'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { EducationHeader } from '@/components/education/EducationHeader';
import { sanitizeGameCode } from '@/lib/multiplayer/sanitizeGameCode';
import { validateGameCode } from '@/utils/validation';
import { cn } from '@/lib/utils';

/**
 * No-account classroom entry for teachers (and students) arriving from
 * NoAccountCta. JoinClassroomForm already accepts a display name with no
 * email; this page is the class-code step that used to be skipped in favour
 * of consumer `/multiplayer?quickPlay=true`.
 */
export function ClassroomGuestDemo() {
  const { t, language } = useLanguage();
  const router = useRouter();
  const isRTL = language === 'he';
  const [code, setCode] = useState('');
  const [errorKey, setErrorKey] = useState<string | null>(null);

  const submit = useCallback(
    (e?: React.FormEvent) => {
      e?.preventDefault();
      const clean = sanitizeGameCode(code).toUpperCase();
      const result = validateGameCode(clean);
      if (!result.isValid) {
        setErrorKey(result.error || 'validation.gameCodeInvalid');
        return;
      }
      setErrorKey(null);
      router.push(`/${language}/join/${clean}`);
    },
    [code, language, router],
  );

  return (
    <div className={cn('flex min-h-dvh flex-col bg-neo-navy text-neo-white', isRTL && 'rtl')}>
      <EducationHeader showBackButton title={t('education.classroomGame.title')} />
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-10">
        <div className="rounded-neo border-neo-thick border-black bg-neo-navy-light p-6 shadow-hard-lg sm:p-8">
          <h1 className="font-neo-display text-3xl font-black tracking-[-0.02em] sm:text-4xl">
            {t('joinByCode.title')}
          </h1>
          <p className="mt-3 text-neo-white/85">{t('joinByCode.subtitle')}</p>
          <form onSubmit={submit} className="mt-6 flex flex-col gap-3">
            <input
              type="text"
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                if (errorKey) setErrorKey(null);
              }}
              placeholder={t('joinByCode.placeholder')}
              aria-label={t('joinByCode.placeholder')}
              aria-invalid={!!errorKey}
              autoComplete="off"
              autoCapitalize="characters"
              dir="ltr"
              className="w-full rounded-neo border-neo-thick border-black bg-neo-cream px-4 py-3 text-center font-neo-display text-2xl font-black uppercase tracking-[0.2em] text-neo-navy placeholder:tracking-normal placeholder:text-neo-navy/40"
            />
            {errorKey && (
              <p role="alert" className="text-sm font-bold text-neo-red">
                {t(errorKey)}
              </p>
            )}
            <button
              type="submit"
              className="rounded-neo border-neo-thick border-black bg-neo-lime px-6 py-3 font-neo-display text-lg font-black uppercase tracking-wider text-neo-navy shadow-hard transition-all hover:-translate-y-0.5 hover:shadow-hard-lg active:translate-y-0 active:shadow-hard-pressed"
            >
              {t('joinByCode.submit')}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
