'use client';

import type { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { LineChart, Send } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { Language } from '@/lib/supabase/education/types';
import { useRealtimeClassroomProgress } from '@/hooks/useRealtimeClassroomProgress';
import { teacherHostHref } from '@/lib/education/teacherHostHref';
import { ClassReportHeader } from '@/components/teacher/reports/ClassReportHeader';
import { ClassOverview } from '@/components/teacher/analytics/overview/ClassOverview';
import { LiveActivityIndicator } from '@/components/teacher/analytics/LiveActivityIndicator';
import LessonEffectivenessChart from '@/components/teacher/analytics/LessonEffectivenessChart';
import { VocabularyHeatmap } from '@/components/teacher/analytics/VocabularyHeatmap';
import { ClassroomRosterProgress } from '@/components/teacher/reports/ClassroomRosterProgress';
import { RoundReports } from '@/components/teacher/rounds/RoundReports';
import { ROUND_FIXTURE } from '@/components/teacher/rounds/roundFixture';
import { WordMasteryReport } from '@/components/teacher/reports/WordMasteryReport';
import { ReportsHomeworkTab } from '@/components/teacher/reports/ReportsHomeworkTab';
import { ClassArcPanel } from '@/components/teacher/reports/ClassArcPanel';
import { ProgressDigestDashboard } from '@/components/teacher/digest/ProgressDigestDashboard';
import { ParentReportPack } from '@/components/teacher/pro/ParentReportPack';
import { ExportAllClassesButton } from '@/components/teacher/reports/ExportAllClassesButton';
import { GoogleClassroomGradePassback } from '@/components/teacher/reports/GoogleClassroomGradePassback';
import { ClassProgressReport } from '@/components/teacher/reports/ClassProgressReport';
import { FullReportDisclosure, ReportDisclosure, SectionDisclosure } from '@/components/teacher/reports/FullReportDisclosure';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ReportsClassEmpty } from './ReportsClassEmpty';
import { ProPoweredChip } from '@/components/teacher/pro/ProPoweredChip';
import { REPORT_TABS, type ReportTab } from './reportParams';

interface ReportsClassViewProps {
  classroomId: string;
  classroom: { name: string; member_count?: number; language?: Language } | undefined;
  section: ReportTab;
  onSectionChange: (tab: ReportTab) => void;
  weekPanel: ReactNode;
  roundPreview: string | null | undefined;
  gradePassbackEnabled: boolean;
  onStudentClick: (studentId: string, name?: string) => void;
}

export function ReportsClassView({ classroomId, classroom, section, onSectionChange, weekPanel, roundPreview, gradePassbackEnabled, onStudentClick }: ReportsClassViewProps) {
  const { t, language } = useLanguage();
  const router = useRouter();
  const name = classroom?.name ?? '';
  // No one has joined, so no game has been played: tabs of empty panels would only say "nothing" five ways.
  const classIsEmpty = classroom?.member_count === 0;
  const live = useRealtimeClassroomProgress({ classroomId, enabled: true });
  const showLive = live.connectionStatus === 'connected' && live.activeStudentsCount > 0;

  return (
    <div className="space-y-4 sm:space-y-5">
      <div data-tm>
        <ClassReportHeader
          eyebrow={t('teacher.reports.title')}
          name={name || t('teacher.reports.title')}
          memberCount={classroom?.member_count}
          onBack={() => router.push(`/${language}/teacher/classroom/${classroomId}`)}
          link={classIsEmpty ? undefined : { href: teacherHostHref(language, { classroomId }), label: t('teacher.weekInsight.startGame'), testId: 'reports-start-game' }}
        >
          {showLive ? (
            <div data-testid="reports-live" className="rounded-neo border-[3px] border-edu-line bg-edu-surface px-3 py-2 shadow-hard">
              <LiveActivityIndicator
                isConnected={live.isConnected}
                activeStudentsCount={live.activeStudentsCount}
                lastUpdate={live.lastUpdate}
                connectionStatus={live.connectionStatus}
              />
            </div>
          ) : null}
        </ClassReportHeader>
      </div>
      {weekPanel}
      {classIsEmpty ? (
        <>
          <ReportsClassEmpty classroomId={classroomId} />
          <ClassroomRosterProgress classroomId={classroomId} classroomName={name} quiet />
        </>
      ) : (
        <>
          <ClassOverview
            classroomId={classroomId}
            classroomName={name}
            surface="reports"
            onOpenChange={(id) => {
              if (id) onStudentClick(id);
            }}
          />
          <Tabs value={section} onValueChange={(v) => onSectionChange(v as ReportTab)} className="space-y-3">
            <TabsList aria-label={t('teacher.reports.tabs.label')} className="grid h-auto w-full grid-cols-5 gap-1.5 rounded-neo border-2 border-edu-line bg-edu-surface p-1.5">
              {REPORT_TABS.map((id) => (
                <TabsTrigger key={id} value={id} className={REPORT_TAB}>
                  {t(`teacher.reports.tabs.${id}`)}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="students">
              <ClassroomRosterProgress classroomId={classroomId} classroomName={name} />
            </TabsContent>

            <TabsContent value="games">
              <RoundReports collapsed classroomId={classroomId} classroomName={name} onStudentClick={onStudentClick} {...roundPreviewProps(roundPreview)} />
            </TabsContent>

            <TabsContent value="words" className="space-y-4">
              <WordMasteryReport classroomId={classroomId} classroomName={name} onStudentClick={onStudentClick} />
              <section aria-label={t('education.analytics.vocabularyMastery')} className={PANEL}>
                <VocabularyHeatmap classroomId={classroomId} />
              </section>
            </TabsContent>

            <ReportsHomeworkTab classroomId={classroomId} classroomName={name} />

            <TabsContent value="more" className="space-y-2.5">
              <SectionDisclosure section="arc">
                <ClassArcPanel
                  classroomId={classroomId}
                  classroomName={name}
                  classroomLanguage={classroom?.language ?? 'en'}
                  onStudentClick={onStudentClick}
                  embedded
                />
              </SectionDisclosure>
              <SectionDisclosure section="digest">
                <ProgressDigestDashboard classroomId={classroomId} classroomName={name} rosterCount={classroom?.member_count ?? 0} />
              </SectionDisclosure>
              <ReportDisclosure
                testId="lessons-disclosure"
                icon={LineChart}
                accent="purple"
                title={t('education.analytics.lessonEffectiveness')}
                badge={<ProPoweredChip className="ms-2 align-middle" />}
                hint={t('eduPro.reports.lessonsHint')}
              >
                {(open) => (open ? <LessonEffectivenessChart classroomId={classroomId} /> : null)}
              </ReportDisclosure>
              <ReportDisclosure
                testId="parent-reports-disclosure"
                icon={Send}
                accent="cyan"
                title={t('parentReportsFlow.title')}
                hint={t('parentReportsFlow.disclosureHint')}
              >
                {(open) => (open ? <ParentReportPack classroomId={classroomId} /> : null)}
              </ReportDisclosure>
              <FullReportDisclosure>
                {() => (
                  <div className="space-y-4">
                    <div className="flex justify-end">
                      <ExportAllClassesButton />
                    </div>
                    <GoogleClassroomGradePassback classroomId={classroomId} enabled={gradePassbackEnabled} />
                    <ClassProgressReport classroomId={classroomId} onStudentClick={onStudentClick} />
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

const PANEL = 'rounded-neo-xl border-[3px] border-edu-line bg-edu-surface p-3 shadow-hard-lg sm:p-4';

// Selected = lime ring on navy-light; unselected keeps a cream edge so it reads as tappable.
const REPORT_TAB =
  'min-h-11 h-auto min-w-0 whitespace-normal rounded-neo border-[2px] px-1 py-1.5 font-neo-body text-xs font-bold leading-tight sm:text-sm focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan data-[state=inactive]:border-edu-line data-[state=inactive]:text-edu-ink data-[state=active]:border-neo-lime data-[state=active]:bg-edu-surface data-[state=active]:text-edu-ink data-[state=active]:ring-2 data-[state=active]:ring-neo-lime';

// Dev-only fixture so the round report can be judged without a played round.
function roundPreviewProps(value: string | null | undefined) {
  if (process.env.NODE_ENV === 'production' || !value) return {};
  const previewGames = value === 'dense'
    ? Array.from({ length: 12 }, (_, i) => ({ ...ROUND_FIXTURE, gameCode: `FIX${String(i + 1).padStart(3, '0')}` }))
    : [ROUND_FIXTURE];
  return { previewGames, previewPro: value === 'pro' || value === 'dense' };
}
