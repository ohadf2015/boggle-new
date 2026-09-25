"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { m, AnimatePresence } from "framer-motion";
import {
  Copy,
  Share2,
  Edit2,
  Trash2,
  Users,
  ChevronDown,
  GraduationCap,
  MoreHorizontal,
  Rocket,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import ClassroomStudentList from "../ClassroomStudentList";
import { StudentCapMeter } from "../StudentCapMeter";
import { slideUp } from "../teacherDashboardTabs";

export interface ClassroomCardData {
  id: string;
  name: string;
  language: string;
  join_code: string;
  member_count?: number;
}

export interface ClassroomCardProps {
  classroom: ClassroomCardData;
  /** Position in the full list — picks the header accent. */
  index: number;
  expanded: boolean;
  onToggleExpanded: () => void;
  onCopy: () => void;
  onShare: () => void;
  /** Google Classroom share URL, or null when it cannot be built (SSR). */
  googleHref: string | null;
  onEdit: () => void;
  onDelete: () => void;
  /**
   * Recent activity + next step (the Classes tab passes it). Absent inside
   * the HQ Tools sheet, where the class pulse already sits above the list.
   */
  activity?: ReactNode;
  /** "Start game" → Teacher HQ with this class preselected (one more tap: GO LIVE). */
  startGameHref?: string;
}

const HEADER_BG = ["bg-neo-cyan", "bg-neo-lime", "bg-neo-pink"] as const;

const PRESS =
  "shadow-hard-sm transition-all hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-hard-pressed";

const MENU_ITEM =
  "flex min-h-11 w-full items-center gap-2 rounded-neo px-3 text-start font-neo-body text-sm font-black text-black hover:bg-black/10 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-neo-cyan";

/**
 * One class on the Classes tab. The join code is the hero — getting students
 * IN is the bottleneck — with copy/share stacked right beside it and Google
 * Classroom one tap away in the header. Rename and delete, done rarely, live
 * in the header's "…" menu, so one class fits a phone with the page still.
 * The roster opens inside the card and scrolls there, never the page.
 */
export function ClassroomCard({
  classroom,
  index,
  expanded,
  onToggleExpanded,
  onCopy,
  onShare,
  googleHref,
  onEdit,
  onDelete,
  activity,
  startGameHref,
}: ClassroomCardProps) {
  const { t } = useLanguage();
  const count = classroom.member_count || 0;
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  // Close on any press outside the menu, or Escape. A document listener, not
  // a `fixed inset-0` backdrop: the card animates in with a transform, which
  // turns `fixed` into "fixed to the card" — the backdrop then covered only
  // the card and swallowed the "…" button itself.
  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: PointerEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);
  const pick = (fn: () => void) => () => {
    setMenuOpen(false);
    fn();
  };

  return (
    <m.div
      variants={slideUp}
      data-testid="classroom-card"
      className="@container relative rounded-neo border-3 border-black bg-neo-cream shadow-hard transition-shadow hover:shadow-hard-lg"
    >
      <div
        className={cn(
          "flex items-center gap-2 rounded-t-[inherit] border-b-3 border-black px-3 py-1.5 [@media(orientation:landscape)_and_(max-height:500px)]:py-1",
          HEADER_BG[index % HEADER_BG.length],
        )}
      >
        <h3 className="min-w-0 flex-1 truncate font-neo-display text-base font-black text-black @[20rem]:text-lg @[24rem]:text-xl">
          {classroom.name}
        </h3>
        <span className="shrink-0 rounded-neo bg-black px-2 py-0.5 text-xs font-black text-white">
          {classroom.language.toUpperCase()}
        </span>
        {/* Google Classroom is how many teachers actually hand out a code —
            one tap, a real link, beside the name rather than in the menu. */}
        {googleHref ? (
          <a
            href={googleHref}
            target="_blank"
            rel="noopener noreferrer"
            data-testid="share-to-google-classroom"
            aria-label={t(
              "teacher.classroom.googleClassroom",
              "Post to Google Classroom",
            )}
            title={t(
              "teacher.classroom.googleClassroom",
              "Post to Google Classroom",
            )}
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-neo border-2 border-black bg-neo-white text-black",
              PRESS,
            )}
          >
            <GraduationCap
              className="size-5"
              strokeWidth={2.5}
              aria-hidden="true"
            />
          </a>
        ) : null}
        <div ref={menuRef} className="relative shrink-0">
          <button
            type="button"
            data-testid="classroom-card-menu"
            onClick={() => setMenuOpen((o) => !o)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-label={t("academy.teacher.classActions", "Class actions")}
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-neo border-2 border-black bg-neo-white text-black",
              PRESS,
            )}
          >
            <MoreHorizontal
              className="size-5"
              strokeWidth={3}
              aria-hidden="true"
            />
          </button>
          <AnimatePresence>
            {menuOpen ? (
              <m.div
                key="menu"
                role="menu"
                data-testid="classroom-card-menu-panel"
                initial={{ opacity: 0, scale: 0.9, y: -6 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: -6 }}
                transition={{ type: "spring", stiffness: 520, damping: 30 }}
                className="absolute end-0 top-full z-30 mt-2 w-56 origin-top-right rounded-neo border-3 border-black bg-neo-cream p-1 shadow-hard-lg rtl:origin-top-left"
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={pick(onEdit)}
                  className={MENU_ITEM}
                >
                  <Edit2 className="size-4 shrink-0" aria-hidden="true" />
                  {t("teacher.classroom.edit")}
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={pick(onDelete)}
                  className={cn(MENU_ITEM, "text-neo-red")}
                >
                  <Trash2 className="size-4 shrink-0" aria-hidden="true" />
                  {t("teacher.classroom.delete")}
                </button>
              </m.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>

      {/* A phone turned sideways has width, not height: a 2x2 of invite |
          cap meter over roster | Start (the roster list opens below). */}
      <div className="space-y-2 p-2.5 [@media(orientation:landscape)_and_(max-height:500px)]:p-2 [@media(orientation:landscape)_and_(max-height:500px)]:grid [@media(orientation:landscape)_and_(max-height:500px)]:grid-cols-2 [@media(orientation:landscape)_and_(max-height:500px)]:gap-2 [@media(orientation:landscape)_and_(max-height:500px)]:space-y-0">
        <div className="flex items-stretch gap-2 rounded-neo border-3 border-black bg-neo-yellow p-2 shadow-hard-sm [@media(orientation:landscape)_and_(max-height:500px)]:col-start-1 [@media(orientation:landscape)_and_(max-height:500px)]:row-start-1">
          <div className="flex min-w-0 flex-1 flex-col items-center justify-center">
            <p
              data-testid="invite-students-label"
              className="font-neo-body text-[0.65rem] font-black uppercase tracking-wide text-black/70"
            >
              {t("teacher.classroom.inviteStudents", "Invite students")}
            </p>
            <code
              data-testid="classroom-join-code"
              dir="ltr"
              className="block whitespace-nowrap text-center font-neo-display text-3xl @[19rem]:text-4xl font-black tabular-nums tracking-wider text-black"
            >
              {classroom.join_code}
            </code>
          </div>
          {/* Stacked, and each button may shrink: side by side, SHARE sliced
              to "SHAR" in a ~300px card. `min-w-0` is what actually lets a
              flex child shrink past its label. The `py-1!` beats globals.css's
              unlayered 0.75rem padding on every landscape-phone <button>. */}
          <div className="flex w-[46%] shrink-0 flex-col gap-1.5">
            <Button
              type="button"
              data-testid="copy-join-code"
              onClick={onCopy}
              className={cn(
                "min-h-10 min-w-0 flex-1 border-2 border-black bg-neo-cyan px-1.5 text-xs font-black text-black [@media(orientation:landscape)_and_(max-height:600px)]:min-h-9 [@media(orientation:landscape)_and_(max-height:600px)]:py-1!",
                PRESS,
              )}
              aria-label={t("teacher.classroom.copyCode")}
            >
              <Copy className="me-1 h-4 w-4 shrink-0" />
              <span className="truncate">
                {t("teacher.classroom.copyCode")}
              </span>
            </Button>
            <Button
              type="button"
              data-testid="share-join-code"
              onClick={onShare}
              className={cn(
                "min-h-10 min-w-0 flex-1 border-2 border-black bg-neo-cream px-1.5 text-xs font-black text-black [@media(orientation:landscape)_and_(max-height:600px)]:min-h-9 [@media(orientation:landscape)_and_(max-height:600px)]:py-1!",
                PRESS,
              )}
              aria-label={t("teacher.classroom.share")}
            >
              <Share2 className="me-1 h-4 w-4 shrink-0" />
              <span className="truncate">{t("teacher.classroom.share")}</span>
            </Button>
          </div>
        </div>

        {/* Short screens (a 375x667 phone, a phone sideways) drop the recap:
            its "next up" repeats the Start button below, and the card must
            fit without scrolling. */}
        {activity ? (
          <div className="max-sm:[@media(max-height:760px)]:hidden [@media(orientation:landscape)_and_(max-height:500px)]:hidden">
            {activity}
          </div>
        ) : null}

        <StudentCapMeter
          studentCount={count}
          source="classroom_card"
          className="py-1.5 [@media(orientation:landscape)_and_(max-height:500px)]:col-start-2 [@media(orientation:landscape)_and_(max-height:500px)]:row-start-1"
        />

        <button
          type="button"
          onClick={onToggleExpanded}
          aria-expanded={expanded}
          className={cn(
            "flex min-h-10 w-full items-center justify-between rounded-neo border-2 border-black px-3 py-1.5 text-sm font-bold shadow-hard-sm transition-all [@media(orientation:landscape)_and_(max-height:500px)]:col-start-1 [@media(orientation:landscape)_and_(max-height:500px)]:row-start-2 [@media(orientation:landscape)_and_(max-height:600px)]:py-1!",
            expanded
              ? "bg-black text-white"
              : "bg-neo-cream text-black hover:bg-black/5",
          )}
        >
          <span className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            {count === 0
              ? t("teacher.classrooms.students.noneYet")
              : t("teacher.classrooms.students.count", { count })}
          </span>
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 transition-transform",
              expanded && "rotate-180",
            )}
          />
        </button>

        <AnimatePresence initial={false}>
          {expanded && (
            <m.div
              key="student-list"
              className="max-h-48 overflow-y-auto overscroll-contain [@media(orientation:landscape)_and_(max-height:500px)]:col-span-2 [@media(orientation:landscape)_and_(max-height:500px)]:row-start-3"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
            >
              <ClassroomStudentList
                classroomId={classroom.id}
                joinCode={classroom.join_code}
              />
            </m.div>
          )}
        </AnimatePresence>

        {startGameHref ? (
          <Link
            href={startGameHref}
            data-testid="classroom-card-start-game"
            className={cn(
              "flex min-h-12 w-full items-center justify-center gap-2 rounded-neo border-3 border-black bg-neo-lime px-4 py-2 [@media(orientation:landscape)_and_(max-height:500px)]:col-start-2 [@media(orientation:landscape)_and_(max-height:500px)]:row-start-2 [@media(orientation:landscape)_and_(max-height:500px)]:min-h-10",
              "font-neo-display text-lg font-black uppercase tracking-tight text-black",
              PRESS,
              "hover:shadow-hard focus:outline-hidden focus-visible:ring-4 focus-visible:ring-neo-cyan",
            )}
          >
            <Rocket className="size-5 shrink-0" strokeWidth={3} aria-hidden="true" />
            {t("academy.hq.startTitle", "Start a game")}
          </Link>
        ) : null}
      </div>
    </m.div>
  );
}

export default ClassroomCard;
