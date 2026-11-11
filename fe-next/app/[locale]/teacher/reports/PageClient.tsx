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
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { AnimatePresence, m, useReducedMotion } from 'framer-motion';
import { ArrowLeft, ClipboardList, Send } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useClassrooms } from '@/hooks/useClassroom';
import { getClassroomStudents } from '@/lib/supabase/education/classrooms';
import { resolveDisplayName } from '@/lib/displayName';
import { StudentProgressReport } from '@/components/teacher/reports/StudentProgressReport';
import { ClassProgressReport } from '@/components/teacher/reports/ClassProgressReport';
import { ClassArcPanel } from '@/components/teacher/reports/ClassArcPanel';
import { StudentArcView } from '@/components/teacher/reports/StudentArcView';
import { ReportsHomeworkTab } from '@/components/teacher/reports/ReportsHomeworkTab';
import { ClassroomRosterProgress } from '@/components/teacher/reports/ClassroomRosterProgress';
import { GoogleClassroomGradePassback } from '@/components/teacher/reports/GoogleClassroomGradePassback';
import { ProgressDigestDashboard } from '@/components/teacher/digest/ProgressDigestDashboard';
import { DirectionalIcon } from '@/components/ui/DirectionalIcon';
import { TeacherPlanBadge } from '@/components/teacher/TeacherPlanBadge';
import { ExportAllClassesButton } from '@/components/teacher/reports/ExportAllClassesButton';
import { TeacherGate } from '@/components/education/TeacherGate';
import { trackEduReportsViewed } from '@/lib/education/telemetry';
import { useTeacherPro } from '@/hooks/useTeacherPro';
import { WordMasteryReport } from '@/components/teacher/reports/WordMasteryReport';
import { RoundReports } from '@/components/teacher/rounds/RoundReports';
import { ROUND_FIXTURE } from '@/components/teacher/rounds/roundFixture';
import { ClassroomPicker, ClassHero } from '@/components/teacher/reports/ClassroomPicker';
import { ReportsNoClasses } from '@/components/teacher/reports/ReportsNoClasses';
import { FullReportDisclosure, ReportDisclosure, SectionDisclosure } from '@/components/teacher/reports/FullReportDisclosure';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ParentReportPack } from '@/components/teacher/pro/ParentReportPack';
import { StudentParentPreview } from '@/components/teacher/reports/StudentParentPreview';
import { ReportsClassEmpty } from './ReportsClassEmpty';
import { ReportsReteachPanel } from './ReportsReteachPanel';
import { ReportsProGate } from './ReportsGate';
import { NeoButton } from '@/components/ui/button';

/** Slide distance for the drill-down; the direction follows depth and locale. */
const SLIDE_PX = 56;
const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

/**
 * TeacherReportsInner - Teacher Reports Page
 *
 * Classroom picker → class report → student report, one level at a time.
 */
function TeacherReportsInner({ gradePassbackEnabled }: { gradePassbackEnabled: boolean }) {
  const { t, dir } = useLanguage();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { classrooms, isLoading: classroomsLoading } = useClassrooms();
  const reduceMotion = useReducedMotion();

  const classroomIdFromUrl = searchParams.get('classroomId');
  const studentIdFromUrl = searchParams.get('studentId');

  // Local state so a click switches views without waiting on navigation...
  const [pickedClassroomId, setSelectedClassroomId] = useState<string | null>(classroomIdFromUrl);
  // One class means nothing to pick: open its report directly.
  const onlyClassroomId = !classroomsLoading && classrooms?.length === 1 ? classrooms[0].id : null;
  const selectedClassroomId = pickedClassroomId ?? onlyClassroomId;
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(studentIdFromUrl);
  const [selectedStudentName, setSelectedStudentName] = useState<string | null>(null);
  const [section, setSection] = useState<string>(() => {
    if (searchParams?.get('roundPreview')) return 'games';
    const asked = searchParams?.get('section');
    return asked && (REPORT_TABS as readonly string[]).includes(asked) ? asked : 'students';
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

  let view: React.ReactNode;
  if (!selectedClassroomId) {
    view = (
      <>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h1 data-wipe className="font-neo-display text-2xl font-bold leading-tight text-neo-white sm:text-3xl">
            {t('teacher.reports.title')}
          </h1>
          {hasPro ? <TeacherPlanBadge /> : null}
        </div>
        <p data-testid="reports-value-line" dir="auto" className="-mt-3 mb-6 max-w-prose text-sm leading-snug text-neo-cream sm:text-base">
          {t('teacher.reports.valueLine', 'After every game, see which words each class missed, who needs help, and what to practice next.')}
        </p>

        {classrooms && classrooms.length > 0 ? (
          <ReportsReteachPanel classrooms={classrooms} onOpenClass={handleClassroomSelect} />
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
          <div data-tm><ClassroomPicker classrooms={classrooms} onSelect={handleClassroomSelect} /></div>
        ) : (
          <ReportsNoClasses />
        )}
      </>
    );
  } else if (selectedStudentId) {
    view = (
      <div className="space-y-5">
        <button
          type="button"
          onClick={handleBackToClass}
          className="inline-flex min-h-11 items-center gap-2 rounded-neo border-2 border-neo-cream/40 bg-neo-navy-light px-3 py-2 text-neo-white shadow-hard-sm transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-hard focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-cyan active:translate-y-0 active:shadow-none"
          aria-label={t('teacher.reports.backToClass')}
        >
          <DirectionalIcon icon={ArrowLeft} className="size-5" />
          <span>{t('teacher.reports.backToClass')}</span>
        </button>
        <StudentArcView
          studentId={selectedStudentId}
          classroomId={selectedClassroomId}
          studentName={selectedStudentName ?? undefined}
        />
        <StudentParentPreview
          classroomId={selectedClassroomId}
          studentId={selectedStudentId}
          studentName={selectedStudentName ?? undefined}
        />
        <StudentProgressReport studentId={selectedStudentId} classroomId={selectedClassroomId} />
      </div>
    );
  } else {
    const selectedClassroom = classrooms?.find((c) => c.id === selectedClassroomId);
    // No one has joined, so no game has been played: tabs of empty panels would only say "nothing" five ways.
    const classIsEmpty = selectedClassroom?.member_count === 0;
    view = (
      <div className="space-y-4 sm:space-y-5">
        <div className="flex flex-wrap items-stretch gap-3">
          <div data-tm className="min-w-0 flex-1">
            <ClassHero name={selectedClassroom?.name ?? t('teacher.reports.title')} memberCount={selectedClassroom?.member_count} />
          </div>
          {hasPro ? <TeacherPlanBadge /> : null}
        </div>
        {classIsEmpty ? null : (
          <NeoButton variant="small" tone="lime" data-testid="reports-homework-shortcut" onClick={() => setSection('homework')}>
            <ClipboardList className="size-4" aria-hidden="true" />
            {t('teacher.reports.homeworkShortcut')}
          </NeoButton>
        )}
        {classIsEmpty ? (
          <ReportsClassEmpty classroomId={selectedClassroomId} />
        ) : (
        <>
        {classrooms ? (
          <ReportsReteachPanel classrooms={classrooms} onOpenClass={handleClassroomSelect} focusClassroomId={selectedClassroomId} />
        ) : null}
        <Tabs value={section} onValueChange={setSection} className="space-y-3">
          <TabsList aria-label={t('teacher.reports.tabs.label')} className="grid h-auto w-full grid-cols-5 gap-1.5 rounded-neo border-2 border-neo-cream/40 bg-neo-navy p-1.5">
            {REPORT_TABS.map((id) => (
              <TabsTrigger key={id} value={id} className={REPORT_TAB}>
                {t(`teacher.reports.tabs.${id}`)}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="students">
            <ClassroomRosterProgress
              classroomId={selectedClassroomId}
              classroomName={selectedClassroom?.name ?? ''}
            />
          </TabsContent>

          <TabsContent value="games">
            <RoundReports
              collapsed
              classroomId={selectedClassroomId}
              classroomName={selectedClassroom?.name ?? ''}
              onStudentClick={handleStudentClick}
              {...roundPreviewProps(searchParams?.get('roundPreview'))}
            />
          </TabsContent>

          <TabsContent value="pulse">
            <WordMasteryReport
              classroomId={selectedClassroomId}
              classroomName={selectedClassroom?.name ?? ''}
              onStudentClick={handleStudentClick}
            />
          </TabsContent>

          <ReportsHomeworkTab
            classroomId={selectedClassroomId}
            classroomName={selectedClassroom?.name ?? ''}
          />

          <TabsContent value="more" className="space-y-2.5">
            <SectionDisclosure section="arc">
              <ClassArcPanel
                classroomId={selectedClassroomId}
                classroomName={selectedClassroom?.name ?? ''}
                classroomLanguage={selectedClassroom?.language ?? 'en'}
                onStudentClick={handleStudentClick}
                embedded
              />
            </SectionDisclosure>
          <SectionDisclosure section="digest">
            <ProgressDigestDashboard
              classroomId={selectedClassroomId}
              classroomName={selectedClassroom?.name ?? ''}
              rosterCount={selectedClassroom?.member_count ?? 0}
            />
          </SectionDisclosure>
            <ReportDisclosure
              testId="parent-reports-disclosure"
              icon={Send}
              accent="cyan"
              title={t('parentReportsFlow.title')}
              hint={t('parentReportsFlow.disclosureHint')}
            >
              {(open) => (open ? <ParentReportPack classroomId={selectedClassroomId} /> : null)}
            </ReportDisclosure>
            <FullReportDisclosure>
              {() => (
                <div className="space-y-4">
                  <div className="flex justify-end">
                    <ExportAllClassesButton />
                  </div>
                  <GoogleClassroomGradePassback classroomId={selectedClassroomId} enabled={gradePassbackEnabled} />
                  <ClassProgressReport classroomId={selectedClassroomId} onStudentClick={handleStudentClick} />
                </div>
              )}
            </FullReportDisclosure>
          </TabsContent>
        </Tabs>
        </>
        )}
      </div>
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

const REPORT_TABS = ['students', 'games', 'pulse', 'homework', 'more'] as const;

// Selected = lime ring on navy-light; unselected keeps a cream edge so it reads as tappable.
const REPORT_TAB =
  'min-h-11 h-auto min-w-0 whitespace-normal rounded-neo border-[2px] px-1 py-1.5 font-neo-body text-xs font-bold leading-tight sm:text-sm focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan data-[state=inactive]:border-neo-cream/40 data-[state=inactive]:text-neo-cream data-[state=active]:border-neo-lime data-[state=active]:bg-neo-navy-light data-[state=active]:text-neo-cream data-[state=active]:ring-2 data-[state=active]:ring-neo-lime';

// Dev-only fixture so the round report can be judged without a played round.
function roundPreviewProps(value: string | null | undefined) {
  if (process.env.NODE_ENV === 'production' || !value) return {};
  const previewGames = value === 'dense'
    ? Array.from({ length: 12 }, (_, i) => ({ ...ROUND_FIXTURE, gameCode: `FIX${String(i + 1).padStart(3, '0')}` }))
    : [ROUND_FIXTURE];
  return { previewGames, previewPro: value === 'pro' || value === 'dense' };
}

/**
 * The shell wraps BOTH gates. Reports has five states a teacher can land on —
 * the role loader, the role denial, the Pro upsell, the class picker, a report —
 * and only the last two are this file's own markup. Measured live as a free
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
      contentClassName="relative p-4 sm:p-6 lg:p-8"
    >
      {/* Calm canvas (Teacher HQ recipe): flat navy, no full-bleed illustration
          behind a working deck. Dark-only surface (pitfall 5). */}
      {/* On a phone the trial strip's full-width button would be the first tap and push the reteach action below the fold. */}
      <div className="relative max-sm:flex max-sm:flex-col [&>[data-testid=pro-gate-lock]]:mx-auto [&>[data-testid=pro-gate-lock]]:max-w-5xl [&_[data-testid=pro-gate-preview]]:hidden [&_[data-testid=pro-gate-lock]>div]:block [&>[data-testid=pro-trial-preview]]:mx-auto [&>[data-testid=pro-trial-preview]]:max-w-5xl max-sm:[&>[data-testid=pro-trial-preview]]:order-last max-sm:[&>[data-testid=pro-trial-preview]]:mb-0 max-sm:[&>[data-testid=pro-trial-preview]]:mt-4">
        {children}
      </div>
    </EducationShell>
  );
}

export default function TeacherReportsPage({ gradePassbackEnabled = false }: { gradePassbackEnabled?: boolean }) {
  return (
    <ReportsShell>
      <TeacherGate>
        <ReportsProGate>
          <TeacherReportsInner gradePassbackEnabled={gradePassbackEnabled} />
        </ReportsProGate>
      </TeacherGate>
    </ReportsShell>
  );
}
