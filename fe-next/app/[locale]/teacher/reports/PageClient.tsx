/**
 * Teacher Reports PageClient
 *
 * Client-side component for the teacher reports page.
 * Allows viewing class and individual student progress reports.
 */

'use client';

import { useTeacherReveal } from '@/components/teacher/motion/useTeacherReveal';
import React, { useState, useCallback, useEffect, useRef, type ReactNode } from 'react';
import { EducationShell } from '@/components/education/shell/EducationShell';
import { TEACHER_TV_SCALE } from '@/components/teacher/hq/tvScale';
import { REPORTS_CONTENT_CLASS } from '@/components/teacher/routeLoading/routeShellClasses';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { AnimatePresence, m, useReducedMotion } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { useClassrooms } from '@/hooks/useClassroom';
import { getClassroomStudents } from '@/lib/supabase/education/classrooms';
import { resolveDisplayName } from '@/lib/displayName';
import { ClassroomWeekPanel } from '@/components/teacher/digest/ClassroomWeekPanel';
import { TeacherGate } from '@/components/education/TeacherGate';
import { ReportsSkeleton } from '@/components/teacher/routeLoading/TeacherSkeletons';
import { trackEduReportsViewed } from '@/lib/education/telemetry';
import { useTeacherPro } from '@/hooks/useTeacherPro';
import { ClassroomPicker } from '@/components/teacher/reports/ClassroomPicker';
import { ReportsNoClasses } from '@/components/teacher/reports/ReportsNoClasses';
import { ReportsReteachPanel } from './ReportsReteachPanel';
import { ReportsProGate } from './ReportsGate';
import { ReportsClassView } from './ReportsClassView';
import { ReportsStudentView } from './ReportsStudentView';
import { reportId, resolveReportTab, type ReportTab } from './reportParams';

/** Slide distance for the drill-down; the direction follows depth and locale. */
const SLIDE_PX = 56;
const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

/**
 * TeacherReportsInner - Teacher Reports Page
 *
 * Classroom picker → class report → student report, one level at a time.
 */
function TeacherReportsInner({ gradePassbackEnabled }: { gradePassbackEnabled: boolean }) {
  const { t, dir, language } = useLanguage();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { classrooms, isLoading: classroomsLoading } = useClassrooms();
  const reduceMotion = useReducedMotion();

  const classroomIdFromUrl = reportId(searchParams.get('classroomId'));
  const studentIdFromUrl = classroomIdFromUrl ? reportId(searchParams.get('studentId')) : null;

  // Local state so a click switches views without waiting on navigation...
  const [pickedClassroomId, setSelectedClassroomId] = useState<string | null>(classroomIdFromUrl);
  // One class means nothing to pick: open its report directly.
  const onlyClassroomId = !classroomsLoading && classrooms?.length === 1 ? classrooms[0].id : null;
  const selectedClassroomId = pickedClassroomId ?? onlyClassroomId;
  const [shownClassId, setShownClassId] = useState<string | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(studentIdFromUrl);
  const [selectedStudentName, setSelectedStudentName] = useState<string | null>(null);
  const [section, setSection] = useState<ReportTab>(() => {
    if (searchParams?.get('roundPreview')) return 'games';
    return resolveReportTab(searchParams?.get('section')) ?? 'students';
  });

  // ...but the URL stays the source of truth: browser Back/Forward change it,
  // and the view used to stay pinned on the old student.
  const urlKey = `${classroomIdFromUrl}|${studentIdFromUrl}`;
  const [seenUrlKey, setSeenUrlKey] = useState(urlKey);
  if (seenUrlKey !== urlKey) {
    setSeenUrlKey(urlKey);
    setSelectedClassroomId(classroomIdFromUrl);
    setSelectedStudentId(studentIdFromUrl);
  }

  // Deeper = slide forward, shallower = slide back.
  const depth = selectedStudentId ? 2 : selectedClassroomId ? 1 : 0;
  const [prevDepth, setPrevDepth] = useState(depth);
  const [travel, setTravel] = useState(1);
  if (prevDepth !== depth) {
    setPrevDepth(depth);
    setTravel(depth > prevDepth ? 1 : -1);
  }

  const pushView = useCallback(
    (classroomId: string | null, studentId: string | null) => {
      const params = new URLSearchParams();
      if (classroomId) params.set('classroomId', classroomId);
      if (studentId) params.set('studentId', studentId);
      router.push(`${pathname}?${params.toString()}`);
    },
    [pathname, router],
  );

  const { hasPro } = useTeacherPro();
  // Reports telemetry is a Pro-funnel signal: the free surface (picker +
  // digest + upsell) is tracked separately, so only fire for a teacher who
  // actually has reports in front of them.
  useEffect(() => {
    if (!hasPro) return;
    const payload: { classroomId?: string; studentId?: string } = {};
    if (classroomIdFromUrl) payload.classroomId = classroomIdFromUrl;
    if (studentIdFromUrl) payload.studentId = studentIdFromUrl;
    trackEduReportsViewed(payload);
    // Fire once per landing — classroom clicks are navigation, not a new view.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasPro]);

  // Handle classroom selection
  const handleClassroomSelect = useCallback(
    (classroomId: string) => {
      setSelectedClassroomId(classroomId);
      setSelectedStudentId(null);
      pushView(classroomId, null);
    },
    [pushView],
  );

  const handleStudentClick = useCallback(
    (studentId: string, name?: string) => {
      setSelectedStudentId(studentId);
      setSelectedStudentName(name ?? null);
      pushView(selectedClassroomId, studentId);
    },
    [pushView, selectedClassroomId],
  );

  const handleBackToClass = useCallback(() => {
    setSelectedStudentId(null);
    pushView(selectedClassroomId, null);
  }, [pushView, selectedClassroomId]);

  // A deep link (or browser Back) lands with a studentId but no name — resolve
  // it from the roster so the arc header and re-queue note greet the student.
  useEffect(() => {
    if (!selectedClassroomId || !selectedStudentId || selectedStudentName) return;
    let cancelled = false;
    getClassroomStudents(selectedClassroomId).then(({ data }) => {
      if (cancelled) return;
      const match = (data ?? []).find((s) => s.student_id === selectedStudentId);
      if (!match) return;
      setSelectedStudentName(
        resolveDisplayName(
          [match.profiles?.display_name, match.profiles?.username],
          t('teacher.reports.arc.unknownStudent')
        )
      );
    });
    return () => {
      cancelled = true;
    };
  }, [selectedClassroomId, selectedStudentId, selectedStudentName, t]);

  const viewKey = selectedStudentId
    ? `student:${selectedStudentId}`
    : selectedClassroomId
      ? `class:${selectedClassroomId}`
      : 'picker';

  // A drill-down from the bottom of a long ranking should land on the new
  // report's header, not mid-table.
  const viewRef = useTeacherReveal<HTMLDivElement>(viewKey);
  const firstView = useRef(true);
  useEffect(() => {
    if (firstView.current) {
      firstView.current = false;
      return;
    }
    viewRef.current?.scrollIntoView?.({
      block: 'start',
      behavior: reduceMotion ? 'auto' : 'smooth',
    });
  }, [viewKey, reduceMotion, viewRef]);

  const offset = SLIDE_PX * (dir === 'rtl' ? -1 : 1);
  const variants = {
    enter: (d: number) => ({ x: reduceMotion ? 0 : d * offset, scale: reduceMotion ? 1 : 0.97 }),
    center: { x: 0, scale: 1 },
    exit: (d: number) => ({
      opacity: 0,
      x: reduceMotion ? 0 : -d * offset * 0.5,
      scale: reduceMotion ? 1 : 0.98,
    }),
  };

  const weekFocus = selectedClassroomId
    ? classrooms?.find((c) => c.id === selectedClassroomId) ?? null
    : classrooms?.find((c) => c.id === shownClassId) ?? classrooms?.[0] ?? null;
  const weekPanel = weekFocus && classrooms && classrooms.length > 0 ? (
    <ClassroomWeekPanel
      classroomIds={classrooms.map((c) => c.id)}
      focusId={weekFocus.id}
      focusName={weekFocus.name}
      language={language}
      t={t}
    />
  ) : null;

  let view: React.ReactNode;
  if (!selectedClassroomId) {
    view = (
      <>
        <h1 data-wipe className="mb-2 font-neo-display text-3xl font-bold leading-tight text-neo-white sm:text-4xl">
          {t('teacher.reports.title')}
        </h1>
        <p data-testid="reports-value-line" dir="auto" className="mb-5 max-w-prose text-base leading-snug text-neo-cream/85 max-sm:hidden">
          {t('teacher.reports.valueLine', 'After every game, see which words each class missed, who needs help, and what to practice next.')}
        </p>

        {weekPanel}

        {classrooms && classrooms.length > 0 ? (
          <ReportsReteachPanel classrooms={classrooms} onShown={setShownClassId} />
        ) : null}

        <h2 className="mb-3 text-base font-bold text-neo-cream">{t('teacher.reports.selectClassroom')}</h2>

        {classroomsLoading ? (
          <div aria-busy="true" className="grid gap-3 sm:grid-cols-2">
            <span className="sr-only" role="status">
              {t('teacher.reports.loadingClassrooms')}
            </span>
            {[0, 1, 2, 3].map((i) => (
              <div key={i} aria-hidden="true" className="h-20 rounded-neo bg-neo-cream/10 motion-safe:animate-pulse" />
            ))}
          </div>
        ) : classrooms && classrooms.length > 0 ? (
          <div data-tm><ClassroomPicker classrooms={classrooms} onSelect={handleClassroomSelect} shownId={shownClassId} /></div>
        ) : (
          <ReportsNoClasses />
        )}
      </>
    );
  } else if (selectedStudentId) {
    view = (
      <ReportsStudentView
        classroomId={selectedClassroomId}
        studentId={selectedStudentId}
        studentName={selectedStudentName}
        onBack={handleBackToClass}
      />
    );
  } else {
    view = (
      <ReportsClassView
        classroomId={selectedClassroomId}
        classroom={classrooms?.find((c) => c.id === selectedClassroomId)}
        section={section}
        onSectionChange={setSection}
        weekPanel={weekPanel}
        roundPreview={searchParams?.get('roundPreview')}
        gradePassbackEnabled={gradePassbackEnabled}
        onStudentClick={handleStudentClick}
      />
    );
  }

  return (
    <div ref={viewRef} className="mx-auto w-full max-w-5xl scroll-mt-4">
      {/* The shell's scroll region is overflow-y:auto, which makes x auto too:
          the slide would flash a horizontal scrollbar. Clip x, padded so the
          hard offset shadows stay inside the clip. */}
      <div className="-mx-2 overflow-x-clip px-2 pb-1">
        <AnimatePresence mode="wait" custom={travel} initial={false}>
          <m.div
            key={viewKey}
            custom={travel}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={
              reduceMotion
                ? { duration: 0.12 }
                : { x: { type: 'spring', stiffness: 320, damping: 30 }, scale: { type: 'spring', stiffness: 320, damping: 30 }, opacity: { duration: 0.16, ease: EASE_OUT_EXPO } }
            }
          >
            {view}
          </m.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

/**
 * The shell wraps BOTH gates. Reports has five states a teacher can land on —
 * the role loader, the role denial, the Pro upsell, the class picker, a report —
 * and only the last two are the page's own markup. Measured live as a free
 * teacher on `/en/teacher/reports`: the upsell rendered with no shell at all and
 * `body` back to plain `.screen-fit`, i.e. the page scrolling again on the one
 * screen we sell Pro from. One shell, above everything, so all five are held.
 */
function ReportsShell({ children }: { children: ReactNode }) {
  const { t } = useLanguage();
  return (
    <EducationShell
      className={TEACHER_TV_SCALE}
      scrollRegionLabel={t("teacher.reports.title")}
      contentClassName={REPORTS_CONTENT_CLASS}
    >
      {/* Calm canvas (Teacher HQ recipe): flat navy, no full-bleed illustration
          behind a working deck. Dark-only surface (pitfall 5). */}
      {/* On a phone the trial strip's full-width button would be the first tap and push the reteach action below the fold. */}
      <div className="relative max-sm:flex max-sm:flex-col [&>[data-testid=pro-gate-lock]]:mx-auto [&>[data-testid=pro-gate-lock]]:max-w-5xl [&_[data-testid=pro-gate-preview]]:hidden [&_[data-testid=pro-gate-lock]>div]:block [&:has([data-testid=own-class-pro-preview])_[data-testid=free-week-sample]]:hidden [&:has([data-testid=own-class-pro-preview])_[data-testid=free-week-insight][data-state=empty]]:block [&>[data-testid=pro-trial-preview]]:mx-auto [&>[data-testid=pro-trial-preview]]:max-w-5xl max-sm:[&>[data-testid=pro-trial-preview]]:order-last max-sm:[&>[data-testid=pro-trial-preview]]:mb-0 max-sm:[&>[data-testid=pro-trial-preview]]:mt-4">
        {children}
      </div>
    </EducationShell>
  );
}

export default function TeacherReportsPage({ gradePassbackEnabled = false }: { gradePassbackEnabled?: boolean }) {
  return (
    <ReportsShell>
      <TeacherGate loadingFallback={<ReportsSkeleton />}>
        <ReportsProGate>
          <TeacherReportsInner gradePassbackEnabled={gradePassbackEnabled} />
        </ReportsProGate>
      </TeacherGate>
    </ReportsShell>
  );
}

export { ReportsShell };
