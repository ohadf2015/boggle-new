'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Eye, Play, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { isTeacherProfile } from '@/lib/education/teacherRole';
import { endTeacherStudentMode, readTeacherStudentMode } from '@/lib/education/teacherStudentMode';
import { cn } from '@/lib/utils';
import { NB_BLOCK, NB_SMALL } from '@/components/teacher/nb/nbStyles';
import { prepareRehearsal } from '@/components/teacher/home/RehearseWithBotsButton';

const BAR_H = 'h-[calc(3.25rem+env(safe-area-inset-top,0px))]';

// Paint containment makes the frame the box every page's `fixed` chrome positions against, so no page needs its own offset.
export function TeacherStudentModeLayer({ children }: { children: ReactNode }) {
  const { profile, user } = useAuth();
  const { t, language } = useLanguage();
  const router = useRouter();
  const pathname = usePathname();
  const [classroomId, setClassroomId] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    setClassroomId(readTeacherStudentMode()?.classroomId ?? null);
  }, [pathname]);

  const active = !!classroomId && isTeacherProfile(profile);

  return (
    <>
      {active ? (
        <div data-testid="teacher-student-mode-bar" className={cn(BAR_H, 'fixed inset-x-0 top-0 z-[70] flex items-center gap-2 border-b-[3px] border-neo-black bg-neo-yellow px-3 pt-[env(safe-area-inset-top,0px)] text-neo-black')}>
          <Eye className="size-5 shrink-0" strokeWidth={2.75} aria-hidden="true" />
          <p className="min-w-0 flex-1 truncate font-neo-display text-sm font-black sm:text-base">
            <span className="sm:hidden">{t('teacher.studentView.bannerShort')}</span>
            <span className="hidden sm:inline">{t('teacher.studentView.banner')}</span>
          </p>
          <button
            type="button"
            data-testid="teacher-student-mode-live"
            disabled={starting}
            aria-label={t('teacher.studentView.liveRound')}
            onClick={async () => {
              setStarting(true);
              router.push(await prepareRehearsal({ userId: user?.id, classroomId: classroomId ?? undefined, source: 'class', language, t, withSeat: true }));
            }}
            className={cn(NB_SMALL, NB_BLOCK.pink)}
          >
            <Play className="size-4" aria-hidden="true" />
            <span className="hidden sm:inline">{t('teacher.studentView.liveRound')}</span>
          </button>
          <button
            type="button"
            data-testid="teacher-student-mode-exit"
            onClick={() => {
              endTeacherStudentMode();
              router.push(`/${language}/teacher/classroom/${classroomId}`);
            }}
            className={cn(NB_SMALL, NB_BLOCK.cream)}
          >
            <X className="size-4" aria-hidden="true" />
            {t('teacher.studentView.exit')}
          </button>
        </div>
      ) : null}
      <div
        data-teacher-student-mode={active ? 'on' : undefined}
        className={active ? 'fixed inset-x-0 bottom-0 flex flex-col top-[calc(3.25rem+env(safe-area-inset-top,0px))] overflow-y-auto [contain:paint] [&>*]:max-h-full' : 'contents'}
      >
        {children}
      </div>
    </>
  );
}
