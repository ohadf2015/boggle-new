'use client';

import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { useStudentClassroom } from '@/hooks/useStudentClassroom';
import { DeadEndPracticeLink } from './DeadEndPracticeLink';
import { joinClassHref } from './joinDestinations';

const K = 'education.student.join';
// Both code generators skip these, so a code holding one was misread off the board.
const LOOKALIKE = /[O0I1]/;

export function JoinWrongCodeHelp({ code }: { code: string }) {
  const { t, language } = useLanguage();
  const { classroomId, isLoading } = useStudentClassroom();

  return (
    <>
      {LOOKALIKE.test(code) && (
        <p className="font-neo-body text-sm font-bold text-neo-yellow lg:text-base">{t(`${K}.noLookalikes`)}</p>
      )}
      {!isLoading && classroomId && (
        <div className="flex flex-col gap-2">
          <p className="font-neo-body text-sm text-neo-white/85 lg:text-base">{t(`${K}.wrongCodeClassLine`)}</p>
          <Link
            data-testid="wrong-code-to-class"
            href={joinClassHref(language)}
            className="inline-flex min-h-11 items-center self-start rounded-neo border-3 border-neo-black bg-neo-lime px-4 py-2 font-neo-display text-sm font-black uppercase text-neo-navy shadow-hard-sm transition-transform active:translate-x-[2px] active:translate-y-[2px] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-neo-lime"
          >
            {t('education.student.gameEnded.toClass')}
          </Link>
        </div>
      )}
      <DeadEndPracticeLink state="invalid_code" variant="quiet" />
    </>
  );
}

export default JoinWrongCodeHelp;
