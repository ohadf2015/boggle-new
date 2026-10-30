"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import toast from "react-hot-toast";
import { AnimatePresence, m } from "framer-motion";
import { Check, Link2, MonitorUp } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { cn } from "@/lib/utils";
import { classroomJoinUrl } from "@/lib/education/classroomInvitePayload";
import {
  trackEduFirstStudentJoined,
  trackEduJoinCodeCopied,
  trackEduJoinCodeShown,
} from "@/lib/education/telemetry";
import {
  captureTeacherOnboardingFunnel,
  TEACHER_ONBOARDING_FUNNEL_EVENTS,
  teacherFunnelPlan,
} from "@/lib/education/teacherOnboardingFunnel";
import { useTeacherPro } from "@/hooks/useTeacherPro";
import { useClassRoster } from "./useClassRoster";
import { RosterSeats } from "./RosterSeats";
import { useHqJuice } from "./useHqJuice";
import { useRisingCount } from "./useRisingCount";
import { STUDENT_GOAL } from "./studentGoal";
import { OUTLINE_BUTTON } from "../home/homeStyles";

export interface HqClassroom {
  id: string;
  name: string;
  join_code: string;
  member_count?: number;
}

export interface GetStudentsInCardProps {
  classroom: HqClassroom;
  onOpenProjector: () => void;
  className?: string;
}

/**
 * The second hero: getting the class IN. The code is the biggest type on the
 * deck (read from the back row), the link copies in one tap, the projector
 * (giant code + QR) in one more, and the roster fills seat by seat as students
 * arrive. Seats and the count come from ONE roster read and the count only
 * ever rises from the number already shown, so the two can never disagree
 * (a count-up restarting from 0 once read "1 joined" beside three seats).
 */
export function GetStudentsInCard({
  classroom,
  onOpenProjector,
  className,
}: GetStudentsInCardProps) {
  const { t, language } = useLanguage();
  const { reduced, sfx } = useHqJuice();
  const { hasPro, status, loading: proLoading } = useTeacherPro();
  const {
    students,
    arrivals,
    loading: rosterLoading,
  } = useClassRoster(classroom.id, t("teacher.classrooms.students.unknown"));
  const headingId = useId();
  const [copied, setCopied] = useState(false);
  // Read after mount: `window.location.origin` during SSR would hydrate a
  // different QR/link than the server rendered.
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);

  const joinUrl = origin
    ? classroomJoinUrl(origin, language, classroom.join_code)
    : "";
  const count = students.length;
  const empty = !rosterLoading && count === 0;
  // Steps up only when someone ARRIVES; the first read is simply true.
  const shownCount = useRisingCount(count, !reduced && arrivals.length > 0);
  const wide = useMediaQuery("(min-width: 1024px)");

  // Ding once per arrival batch, never on the first read (the hook guarantees
  // arrivals are empty then).
  const lastArrivals = useRef<string>("");
  useEffect(() => {
    const key = arrivals.join(",");
    if (!key || key === lastArrivals.current) return;
    lastArrivals.current = key;
    sfx.playPlayerJoinedSound();
  }, [arrivals, sfx]);

  const shownFor = useRef<string | null>(null);
  const prevCount = useRef<number | null>(null);
  const trackedClassroomId = useRef(classroom.id);
  if (trackedClassroomId.current !== classroom.id) {
    trackedClassroomId.current = classroom.id;
    shownFor.current = null;
    prevCount.current = null;
  }
  useEffect(() => {
    if (!empty) return;
    if (shownFor.current === classroom.id) return;
    shownFor.current = classroom.id;
    trackEduJoinCodeShown({ classroomId: classroom.id });
  }, [empty, classroom.id]);

  useEffect(() => {
    if (rosterLoading) return;
    if (prevCount.current === 0 && count >= 1) {
      trackEduFirstStudentJoined({ classroomId: classroom.id });
      // Onboarding-funnel step (teacher's own person; the server-side
      // edu_student_joined is the STUDENT's). `unknown` plan beats dropping
      // the event while the entitlement read is still in flight.
      captureTeacherOnboardingFunnel(TEACHER_ONBOARDING_FUNNEL_EVENTS.studentJoined, {
        locale: language,
        plan: teacherFunnelPlan({ hasPro, status, loading: proLoading }),
      });
    }
    prevCount.current = count;
  }, [rosterLoading, count, classroom.id, language, proLoading, hasPro, status]);

  const copyLink = useCallback(async () => {
    const url = classroomJoinUrl(
      window.location.origin,
      language,
      classroom.join_code,
    );
    try {
      await navigator.clipboard.writeText(url);
      trackEduJoinCodeCopied({ classroomId: classroom.id });
      sfx.playButtonClickSound();
      setCopied(true);
      toast.success(t("share.linkCopied"));
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error(t("share.codeCopyError"));
    }
  }, [classroom.id, classroom.join_code, language, sfx, t]);

  const openProjector = useCallback(() => {
    sfx.playButtonClickSound();
    onOpenProjector();
  }, [onOpenProjector, sfx]);

  const waiting = rosterLoading || count === 0;
  const copyLabel = t("academy.hq.copyLink", "Copy link");
  const projectorLabel = t("academy.hq.openProjector", "Open projector");

  return (
    <section
      data-testid="hq-get-students-in"
      aria-labelledby={headingId}
      className={cn("@container flex flex-col gap-2 rounded-neo border-2 border-neo-cream/35 bg-neo-navy p-2.5", className)}
    >
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
        <h3 id={headingId} className="w-full font-neo-body text-xs font-bold leading-snug text-neo-cream/70 max-sm:sr-only">
          {t("academy.hq.getStudentsIn", "Get students in")}
        </h3>
        <p data-testid="hq-join-code" dir="ltr" className="flex gap-1">
          <span className="sr-only">{classroom.join_code}</span>
          {Array.from(classroom.join_code ?? "").map((ch, i) => (
            <span
              key={`${ch}-${i}`}
              aria-hidden="true"
              className="grid size-[clamp(1.75rem,6cqi,2.75rem)] place-items-center rounded-neo border-2 border-neo-black bg-neo-cream font-neo-display text-[clamp(1rem,3.4cqi,1.5rem)] font-black uppercase text-neo-black"
            >
              {ch}
            </span>
          ))}
        </p>
        <div data-testid="hq-join-actions" className="flex gap-1.5 sm:gap-2">
          <button type="button" data-testid="hq-copy-link" onClick={copyLink} aria-label={copyLabel} className={cn(OUTLINE_BUTTON, "max-sm:min-w-11 max-sm:px-0")}>
            {copied ? <Check className="size-4" strokeWidth={3} aria-hidden="true" /> : <Link2 className="size-4" strokeWidth={3} aria-hidden="true" />}
            <span className="max-sm:hidden">{copyLabel}</span>
          </button>
          <button type="button" data-testid="hq-open-projector" onClick={openProjector} aria-label={projectorLabel} className={cn(OUTLINE_BUTTON, "max-sm:min-w-11 max-sm:px-0")}>
            <MonitorUp className="size-4" strokeWidth={3} aria-hidden="true" />
            <span className="max-sm:hidden">{projectorLabel}</span>
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        {!rosterLoading && count < STUDENT_GOAL ? (
          <div data-testid="hq-joined-goal" className="flex shrink-0 items-center gap-1.5">
            <span className="flex gap-1" aria-hidden="true">
              {Array.from({ length: STUDENT_GOAL }, (_, i) => (
                <span key={i} className={cn("size-2 rounded-full", i < count ? "bg-neo-cream" : "bg-neo-cream/25")} />
              ))}
            </span>
            <span className="inline-flex items-baseline gap-1 font-neo-body text-xs font-bold text-neo-cream/80">
              <span data-testid="hq-joined-goal-count" dir="ltr" className="tabular-nums">{count}/{STUDENT_GOAL}</span>
              {t("academy.hq.joinedLabel")}
            </span>
          </div>
        ) : null}
        <div
          data-testid="hq-roster-row"
          className={cn(
            "flex min-h-9 min-w-0 flex-1 items-center gap-2 rounded-neo border border-neo-cream/35 px-2 py-1",
            empty && "border-dashed",
          )}
        >
          {waiting ? (
            <div data-testid={empty ? "hq-first-student-panel" : "hq-roster-waiting"} className="flex min-w-0 flex-1 items-center gap-2">
              {empty && joinUrl ? (
                <span data-testid="hq-first-student-qr" className="hidden size-9 shrink-0 rounded-sm bg-neo-white p-0.5 lg:block">
                  <QRCodeSVG value={joinUrl} size={96} level="L" style={{ width: "100%", height: "100%" }} aria-hidden="true" />
                </span>
              ) : null}
              {empty ? (
                <p data-testid="hq-first-student-title" className="min-w-0 font-neo-body text-xs font-bold leading-snug text-neo-cream sm:text-sm">
                  {t("academy.hq.firstStudentTitle", "Get your first student in")}
                </p>
              ) : (
                <JoinedCount loading={rosterLoading} count={count} shown={shownCount} reduced={reduced} label={t("academy.hq.joinedLabel")} empty={t("academy.hq.nobodyYet")} />
              )}
            </div>
          ) : (
            <>
              <RosterSeats
                students={students}
                arrivals={arrivals}
                reduced={reduced}
                seats={wide ? Math.min(Math.max(count, 1), 8) : 5}
                size={28}
                showNames={false}
                className="shrink-0"
              />
              <JoinedCount
                loading={false}
                count={count}
                shown={shownCount}
                reduced={reduced}
                label={t("academy.hq.joinedLabel", "joined")}
                empty={t("academy.hq.nobodyYet", "No one yet — share the code")}
              />
            </>
          )}
        </div>
        <span
          data-testid="hq-join-status"
          title={t("academy.hq.codeReady", "Code ready")}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-neo-cream/35 px-2 py-0.5 font-neo-body text-xs font-bold text-neo-cream/80 max-sm:hidden"
        >
          <span className="size-2 rounded-full bg-neo-cream/70" aria-hidden="true" />
          <span>{t("academy.hq.codeReady", "Code ready")}</span>
        </span>
      </div>
    </section>
  );
}

interface JoinedCountProps {
  loading: boolean;
  count: number;
  shown: number;
  reduced: boolean;
  label: string;
  empty: string;
}

/**
 * The one count on the card. Pessimistic while the first read is open
 * (pitfall class 1); a big "0" plus the nudge when empty; springs up a step
 * per arrival otherwise.
 */
function JoinedCount({ loading, count, shown, reduced, label, empty }: JoinedCountProps) {
  return (
    <p
      data-testid="hq-joined-count"
      aria-live="polite"
      className="flex min-w-0 items-baseline gap-1.5 font-neo-body text-sm font-bold leading-tight text-neo-cream"
    >
      {loading ? (
        <span className="text-base text-neo-cream/50">…</span>
      ) : (
        <>
          <AnimatePresence initial={false} mode="popLayout">
            <m.span
              key={shown}
              initial={reduced ? false : { scale: 1.8, y: -4 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 600, damping: 18 }}
              className={cn(
                "inline-block shrink-0 font-neo-display text-base font-black tabular-nums",
                count > 0 ? "text-neo-cream" : "text-neo-cream/60",
              )}
            >
              {shown}
            </m.span>
          </AnimatePresence>
          <span className="min-w-0">{count > 0 ? label : empty}</span>
        </>
      )}
    </p>
  );
}

export default GetStudentsInCard;
