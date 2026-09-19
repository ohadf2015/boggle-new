/**
 * Teacher Reports PageClient
 *
 * Client-side component for the teacher reports page.
 * Allows viewing class and individual student progress reports.
 */

'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { AnimatePresence, m, useReducedMotion } from 'framer-motion';
import { ArrowLeft, ChevronRight, Users } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useClassrooms } from '@/hooks/useClassroom';
import { StudentProgressReport } from '@/components/teacher/reports/StudentProgressReport';
import { ClassProgressReport } from '@/components/teacher/reports/ClassProgressReport';
import { ProgressDigestDashboard } from '@/components/teacher/digest/ProgressDigestDashboard';
import { EducationShell } from '@/components/education/shell/EducationShell';
import { EducationHeader } from '@/components/education/EducationHeader';
import { DirectionalIcon } from '@/components/ui/DirectionalIcon';
import { TeacherPlanBadge } from '@/components/teacher/TeacherPlanBadge';
import { TeacherGate } from '@/components/education/TeacherGate';
import { ProGate } from '@/components/teacher/ProGate';

/** Slide distance for the drill-down; the direction follows depth and locale. */
const SLIDE_PX = 32;
const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

/**
 * TeacherReportsInner - Teacher Reports Page
 *
 * Classroom picker → class report → student report, one level at a time.
 */
function TeacherReportsInner() {
  const { t, dir } = useLanguage();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { classrooms, isLoading: classroomsLoading } = useClassrooms();
  const reduceMotion = useReducedMotion();

  const classroomIdFromUrl = searchParams.get('classroomId');
  const studentIdFromUrl = searchParams.get('studentId');

  // Local state so a click switches views without waiting on navigation...
  const [selectedClassroomId, setSelectedClassroomId] = useState<string | null>(classroomIdFromUrl);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(studentIdFromUrl);

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

  const handleClassroomSelect = useCallback(
    (classroomId: string) => {
      setSelectedClassroomId(classroomId);
      setSelectedStudentId(null);
      pushView(classroomId, null);
    },
    [pushView],
  );

  const handleStudentClick = useCallback(
    (studentId: string) => {
      setSelectedStudentId(studentId);
      pushView(selectedClassroomId, studentId);
    },
    [pushView, selectedClassroomId],
  );

  const handleBackToClass = useCallback(() => {
    setSelectedStudentId(null);
    pushView(selectedClassroomId, null);
  }, [pushView, selectedClassroomId]);

  const viewKey = selectedStudentId
    ? `student:${selectedStudentId}`
    : selectedClassroomId
      ? `class:${selectedClassroomId}`
      : 'picker';

  // A drill-down from the bottom of a long ranking should land on the new
  // report's header, not mid-table.
  const viewRef = useRef<HTMLDivElement>(null);
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
  }, [viewKey, reduceMotion]);

  const offset = SLIDE_PX * (dir === 'rtl' ? -1 : 1);
  const variants = {
    enter: (d: number) => ({ opacity: 0, x: reduceMotion ? 0 : d * offset }),
    center: { opacity: 1, x: 0 },
    exit: (d: number) => ({
      opacity: 0,
      x: reduceMotion ? 0 : -d * offset * 0.5,
    }),
  };

  let view: React.ReactNode;
  if (!selectedClassroomId) {
    view = (
      <>
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-neo-display text-3xl font-bold text-neo-white sm:text-4xl">
            {t('teacher.reports.title')}
          </h1>
          <TeacherPlanBadge />
        </div>

        <h2 className="mb-4 text-lg font-bold text-neo-cream/80">{t('teacher.reports.selectClassroom')}</h2>

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
          <ul className="grid gap-3 sm:grid-cols-2">
            {classrooms.map((classroom) => (
              <li key={classroom.id}>
                <button
                  type="button"
                  onClick={() => handleClassroomSelect(classroom.id)}
                  // The class picker IS the primary action of this screen, and
                  // it read as navy-on-navy with a black edge (~1.2:1 both
                  // ways). Cream edge + a lighter fill puts it back on the page.
                  className="group flex min-h-20 w-full items-center justify-between gap-3 rounded-neo border-[3px] border-neo-cream bg-neo-navy-light p-4 text-start shadow-hard transition-[transform,box-shadow] duration-150 hover:-translate-y-0.5 hover:shadow-hard-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-cyan active:translate-y-0.5 active:shadow-none"
                >
                  <span className="min-w-0">
                    <span className="block break-words font-neo-display text-lg font-bold text-neo-white">
                      {classroom.name}
                    </span>
                    {typeof classroom.member_count === 'number' && (
                      <span className="mt-1 inline-flex items-center gap-1.5 text-sm text-neo-cream/75 tabular-nums">
                        <Users aria-hidden="true" className="size-4" />
                        <span className="sr-only">{t('teacher.reports.metrics.totalStudents')}: </span>
                        {classroom.member_count}
                      </span>
                    )}
                  </span>
                  <span className="grid size-10 shrink-0 place-items-center rounded-neo border-2 border-black bg-neo-cyan text-black transition-transform group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5">
                    <DirectionalIcon icon={ChevronRight} className="size-5" />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-neo border-2 border-dashed border-neo-cream/30 p-8 text-center text-neo-cream/80">
            {t('teacher.reports.noClassroomsFound')}
          </p>
        )}
      </>
    );
  } else if (selectedStudentId) {
    view = (
      <ProGate feature="reports">
      <>
        <button
          type="button"
          onClick={handleBackToClass}
          className="mb-6 inline-flex min-h-11 items-center gap-2 rounded-neo border-2 border-neo-cream bg-neo-navy-light px-3 py-2 text-neo-white shadow-hard-sm transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-hard focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-cyan active:translate-y-0 active:shadow-none"
          aria-label={t('teacher.reports.backToClass')}
        >
          <DirectionalIcon icon={ArrowLeft} className="size-5" />
          <span>{t('teacher.reports.backToClass')}</span>
        </button>
        <StudentProgressReport studentId={selectedStudentId} classroomId={selectedClassroomId} />
      </>
      </ProGate>
    );
  } else {
    const selectedClassroom = classrooms?.find((c) => c.id === selectedClassroomId);
    view = (
      <div className="space-y-8">
        <ProgressDigestDashboard
          classroomId={selectedClassroomId}
          classroomName={selectedClassroom?.name ?? ''}
          rosterCount={selectedClassroom?.member_count ?? 0}
        />
        <ProGate feature="reports">
          <ClassProgressReport classroomId={selectedClassroomId} onStudentClick={handleStudentClick} />
        </ProGate>
      </div>
    );
  }

  return (
    <div ref={viewRef} className="mx-auto max-w-5xl scroll-mt-4">
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
            transition={{
              duration: reduceMotion ? 0.12 : 0.32,
              ease: EASE_OUT_EXPO,
            }}
          >
            {view}
          </m.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

// Last-lesson digest is free (same last-game read as the dashboard pulse).
// Full class/student reports stay behind ProGate, mounted inside Inner so a
// free teacher still gets the picker + digest + Teacher Pro CTA.
export default function TeacherReportsPage() {
  return (
    <ReportsShell>
      <TeacherGate>
        <TeacherReportsInner />
      </TeacherGate>
    </ReportsShell>
  );
}

/**
 * The shell wraps BOTH gates. Reports has five states a teacher can land on —
 * the role loader, the role denial, the Pro upsell, the class picker, a report —
 * and only the last two are this file's own markup. Measured live as a free
 * teacher on `/en/teacher/reports`: the upsell rendered with no shell at all and
 * `body` back to plain `.screen-fit`, i.e. the page scrolling again on the one
 * screen we sell Pro from. One shell, above everything, so all five are held.
 */
function ReportsShell({ children }: { children: React.ReactNode }) {
  const { t } = useLanguage();
  return (
    <EducationShell
      header={<EducationHeader showBackButton />}
      scrollRegionLabel={t('teacher.reports.title')}
      contentClassName="p-4 sm:p-6 lg:p-8"
    >
      {children}
    </EducationShell>
  );
}
