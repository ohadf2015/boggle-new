"use client";

import Link from "next/link";
import { FileText } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import ClassroomManager from "../ClassroomManager";
import { AssignmentTrackingPanel } from "../assignments";
import { AnalyticsDashboard } from "../analytics/AnalyticsDashboard";
import { LastGameInsights } from "../analytics/LastGameInsights";
import { ProGate } from "../ProGate";
import { StudentCapMeter } from "../StudentCapMeter";
import { ClassPulseSection } from "../dashboard/ClassPulseSection";
import { ClassroomWindowProgress } from "../dashboard/ClassroomWindowProgress";
import { TeacherOnboardingChecklistLive } from "../dashboard/TeacherOnboardingChecklist";

export interface HqToolsClassroom {
  id: string;
  name: string;
  join_code?: string;
  member_count?: number;
}

export interface HqToolsContentProps {
  open: boolean;
  classroomCount: number;
  selectedClassroom: HqToolsClassroom | null;
  reportsHref: string;
  hideCreateClassroomCta: boolean;
  onCreateClassroom: () => void;
  onCreateAssignment: () => void;
  onInvite: () => void;
  onPlay: () => void;
  onReviewWords: (words: string[]) => void;
}

/**
 * Everything on Teacher HQ that is not "start a game" or "get students in":
 * the class pulse, 7/30-day progress, the activation checklist, the class
 * manager, last-game insights, assignments, Pro analytics, reports.
 *
 * Rendered inside the Tools sheet. Two things mount ONLY while the sheet is
 * open, because they report what the teacher saw: the onboarding checklist
 * (fires `teacher_onboarding_step` view) and the analytics paywall (`active`).
 * Firing either for a closed sheet would be a phantom impression.
 */
export function HqToolsContent({
  open,
  classroomCount,
  selectedClassroom,
  reportsHref,
  hideCreateClassroomCta,
  onCreateClassroom,
  onCreateAssignment,
  onInvite,
  onPlay,
  onReviewWords,
}: HqToolsContentProps) {
  const { t } = useLanguage();
  const id = selectedClassroom?.id ?? null;

  return (
    <>
      {open ? (
        <TeacherOnboardingChecklistLive
          classroomCount={classroomCount}
          classroomId={id}
          rosterCount={selectedClassroom?.member_count || 0}
          joinCode={selectedClassroom?.join_code}
          reportsHref={reportsHref}
          onCreateClassroom={onCreateClassroom}
          onCreateAssignment={onCreateAssignment}
          hideCreateClassroomCta={hideCreateClassroomCta}
        />
      ) : null}

      {selectedClassroom ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-3">
            <StudentCapMeter
              studentCount={selectedClassroom.member_count || 0}
              source="dashboard"
            />
            <ClassPulseSection
              classroomId={selectedClassroom.id}
              classroomName={selectedClassroom.name}
              rosterCount={selectedClassroom.member_count || 0}
              onInvite={onInvite}
              onPlay={onPlay}
              onReviewWords={onReviewWords}
              // START on the deck is the one launch path.
              hidePlayAction
            />
          </div>
          <ClassroomWindowProgress
            classroomId={selectedClassroom.id}
            classroomName={selectedClassroom.name}
          />
        </div>
      ) : null}

      <ClassroomManager />

      {id ? (
        <>
          {/* "Which words did we miss" is the question at the bell — free for
              everyone. The cross-game trend view is what Pro sells. */}
          <LastGameInsights
            classroomId={id}
            onCreateReviewLesson={onReviewWords}
          />
          <AssignmentTrackingPanel
            classroomId={id}
            onCreateAssignment={onCreateAssignment}
          />
          <ProGate feature="analytics" active={open}>
            <AnalyticsDashboard
              classroomId={id}
              onCreateReviewLesson={onReviewWords}
            />
          </ProGate>
          <Link
            href={reportsHref}
            className={cn(
              "flex items-center gap-3 rounded-neo border-2 border-black p-4",
              "bg-neo-cream font-neo-body font-bold text-black shadow-hard transition-all hover:-translate-y-0.5 hover:shadow-hard-lg",
            )}
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-neo border-2 border-black bg-neo-lime shadow-hard-sm">
              <FileText className="size-5 text-black" aria-hidden="true" />
            </span>
            <span>
              <span className="block text-sm font-black uppercase">
                {t("teacher.dashboard.viewReports")}
              </span>
              <span className="block text-xs text-black/60">
                {t("teacher.dashboard.viewReportsDesc")}
              </span>
            </span>
          </Link>
        </>
      ) : null}
    </>
  );
}

export default HqToolsContent;
