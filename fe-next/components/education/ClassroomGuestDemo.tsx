'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { EducationHeader } from '@/components/education/EducationHeader';
import { sanitizeGameCode } from '@/lib/multiplayer/sanitizeGameCode';
import { validateGameCode } from '@/utils/validation';
import { cn } from '@/lib/utils';
import { TV_STAGE_ZOOM_CLASS } from '@/components/education/lobby/tvStageScale';
import { m } from 'framer-motion';
import { EduMascot } from '@/components/education/EduMascot';
import { ClassroomGuestDemoNextSteps } from '@/components/education/ClassroomGuestDemoNextSteps';
import { ClassroomGuestDemoCodeTiles } from '@/components/education/ClassroomGuestDemoCodeTiles';
import { EDU_MOTION, pressClasses, pressMotion, Reveal, useReducedMotionSafe } from '@/components/education/motion';

/**
 * No-account classroom entry for teachers (and students) arriving from
 * NoAccountCta. JoinFlow already accepts a display name with no email;
 * this is the class-code step that used to be skipped in favour of
 * consumer `/multiplayer?quickPlay=true`.
 *
 * The promise this keeps: class code → `/join/[code]` → display name.
 * Nothing here asks for an email or a password, so the "no sign-up"
 * copy on the education hub stays honest.
 */
export function ClassroomGuestDemo() {
  const { t, language } = useLanguage();
  const router = useRouter();
  const isRTL = language === 'he';
  const reduced = useReducedMotionSafe();
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

  const ready = validateGameCode(sanitizeGameCode(code)).isValid;
  const pose = errorKey ? 'error' : ready ? 'success' : 'welcome';

  return (
    <div className={cn('flex h-dvh min-h-0 flex-col overflow-hidden bg-neo-navy text-neo-white', isRTL && 'rtl')}>
      <EducationHeader compact showBackButton title={t('education.classroomGame.title')} />
      <form
        onSubmit={submit}
        data-testid="guest-join-stage"
        className="flex min-h-0 w-full flex-1 flex-col items-center justify-center overflow-y-auto px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4"
      >
        <div className={cn('flex w-full max-w-[37.5rem] flex-col items-center gap-4 sm:gap-5 lg:max-w-[46rem]', TV_STAGE_ZOOM_CLASS)}>
          <div
            data-testid="guest-join-column"
            className="relative mt-[clamp(3rem,11dvh,7.5rem)] flex w-full flex-col gap-4 rounded-neo-xl border-[3px] border-neo-cream/50 bg-neo-navy-light px-4 pb-5 pt-[clamp(2.75rem,8dvh,5.5rem)] shadow-[0_8px_0_0] shadow-neo-purple sm:gap-5 sm:px-8 sm:pb-7 lg:gap-6 lg:px-12 lg:pb-9"
          >
            <m.div
              aria-hidden="true"
              className="absolute inset-x-0 top-0 mx-auto w-fit -translate-y-[62%]"
              initial={reduced ? false : { scale: 0.8, rotate: -6 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={reduced ? { duration: 0 } : EDU_MOTION.spring.pop}
            >
              <m.div
                animate={reduced ? { y: 0 } : { y: [0, -6, 0] }}
                transition={reduced ? { duration: 0 } : { duration: 2.4, ease: 'easeInOut', repeat: Infinity }}
              >
                <m.div
                  key={pose}
                  initial={reduced ? false : { scale: 0.86, rotate: pose === 'error' ? 4 : -4 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={reduced ? { duration: 0 } : EDU_MOTION.spring.pop}
                >
                  <EduMascot moment={pose} size={256} className="size-[clamp(6.5rem,19dvh,13.5rem)]" />
                </m.div>
              </m.div>
            </m.div>
            <Reveal delay={0.08} className="text-center">
              <h1 className="text-balance font-neo-display text-[2rem] font-black leading-[1.05] tracking-[-0.02em] sm:text-5xl lg:text-6xl">
                {t('joinByCode.title')}
              </h1>
              <ClassroomGuestDemoLive label={t('joinByCode.waiting')} reduced={reduced} />
            </Reveal>
            <div className="flex flex-col gap-4">
              <ClassroomGuestDemoCodeTiles
                code={code}
                onChange={(value) => {
                  setCode(sanitizeGameCode(value));
                  if (errorKey) setErrorKey(null);
                }}
                label={t('joinByCode.placeholder')}
                error={!!errorKey}
                ready={ready}
                reduced={reduced}
                describedBy={errorKey ? 'guest-join-error' : undefined}
              />
              {errorKey && (
                <p id="guest-join-error" role="alert" className="-mt-1 text-center text-sm font-bold text-neo-red">
                  {t(errorKey)}
                </p>
              )}
              {/* aria-disabled, not disabled: a tap on an unfinished code still says what is wrong. */}
              <m.button
                type="submit"
                data-testid="guest-join-submit"
                data-ready={ready ? 'true' : 'false'}
                aria-disabled={ready ? 'false' : 'true'}
                {...pressMotion(reduced || !ready)}
                className={cn(
                  'block min-h-14 w-full rounded-neo-lg border-[3px] px-6 py-3 font-neo-display text-lg font-black uppercase tracking-[0.12em] sm:min-h-16 sm:text-xl lg:min-h-[4.5rem] lg:text-2xl',
                  'transition-[filter,background-color,color,box-shadow,border-color] duration-200 motion-reduce:transition-none',
                  ready
                    ? cn(pressClasses(4), 'border-neo-black bg-neo-lime text-neo-black shadow-neo-lime-dark')
                    : 'cursor-not-allowed border-neo-lime/70 bg-neo-lime/10 text-neo-lime shadow-[0_4px_0_0] shadow-neo-lime-dark/60 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan',
                )}
              >
                {t('joinByCode.submit')}
              </m.button>
            </div>
            <ClassroomGuestDemoNextSteps t={t} ready={ready} />
          </div>
        </div>
      </form>
    </div>
  );
}

function ClassroomGuestDemoLive({ label, reduced }: { label: string; reduced: boolean }) {
  return (
    <p data-testid="guest-join-live" className="mx-auto mt-2 flex w-fit max-w-full items-center justify-center gap-2 text-start font-neo-body text-[0.9375rem] font-bold leading-snug text-neo-cream/85 sm:gap-2.5 sm:text-lg lg:text-xl">
      <span aria-hidden="true" className="relative flex size-3 shrink-0 items-center justify-center">
        {!reduced && (
          <m.span
            className="absolute inset-0 rounded-full border-2 border-neo-lime"
            animate={{ scale: [1, 2.2] }}
            transition={{ duration: 1.4, ease: 'easeOut', repeat: Infinity, repeatDelay: 0.4 }}
          />
        )}
        <span className="size-3 rounded-full bg-neo-lime" />
      </span>
      <span className="min-w-0">{label}</span>
    </p>
  );
}
