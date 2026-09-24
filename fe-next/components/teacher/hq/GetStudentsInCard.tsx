"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import toast from "react-hot-toast";
import { AnimatePresence, m } from "framer-motion";
import { Check, Link2, MonitorUp, QrCode, UsersRound } from "lucide-react";
import { JoinCardFrame } from "./JoinCardFrame";
import { useLanguage } from "@/contexts/LanguageContext";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { cn } from "@/lib/utils";
import { classroomJoinUrl } from "@/lib/education/classroomInvitePayload";
import { useClassRoster } from "./useClassRoster";
import { RosterSeats } from "./RosterSeats";
import { useHqJuice } from "./useHqJuice";
import { useRisingCount } from "./useRisingCount";

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

/** A secondary join affordance: quiet navy, cream edge (contrast on navy), coloured icon. */
const SECONDARY =
  "inline-flex min-h-12 min-w-0 flex-col items-center justify-center gap-0.5 rounded-neo border-2 border-neo-cream/70 bg-neo-navy px-1 py-1 text-center font-neo-display text-[0.65rem] font-black uppercase leading-none tracking-wide text-neo-white shadow-hard-sm sm:flex-row sm:gap-1.5 transition-all hover:-translate-y-0.5 hover:border-neo-cream active:translate-y-0.5 active:shadow-hard-pressed focus:outline-hidden focus-visible:ring-4 focus-visible:ring-neo-cyan sm:text-xs lg:min-h-12 lg:text-sm";

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
  const {
    students,
    arrivals,
    loading: rosterLoading,
  } = useClassRoster(classroom.id, t("teacher.classrooms.students.unknown"));
  const [copied, setCopied] = useState(false);
  // Read after mount: `window.location.origin` during SSR would hydrate a
  // different QR/link than the server rendered.
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);

  const joinUrl = origin
    ? classroomJoinUrl(origin, language, classroom.join_code)
    : "";
  const count = students.length;
  // Steps up only when someone ARRIVES; the first read is simply true.
  const shownCount = useRisingCount(count, !reduced && arrivals.length > 0);
  // Seat size is a visual choice only; SSR/first paint uses the phone size.
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

  const copyLink = useCallback(async () => {
    const url = classroomJoinUrl(
      window.location.origin,
      language,
      classroom.join_code,
    );
    try {
      await navigator.clipboard.writeText(url);
      sfx.playButtonClickSound();
      setCopied(true);
      toast.success(t("share.linkCopied"));
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error(t("share.codeCopyError"));
    }
  }, [classroom.join_code, language, sfx, t]);

  const openProjector = useCallback(() => {
    sfx.playButtonClickSound();
    onOpenProjector();
  }, [onOpenProjector, sfx]);

  const shortUrl = joinUrl.replace(/^https?:\/\//, "");
  const waiting = rosterLoading || count === 0;

  return (
    <JoinCardFrame
      testId="hq-get-students-in"
      className={className}
      // HQ never hosts the game itself: GO LIVE opens the room. Until then
      // the class code is ready and working — say exactly that.
      status={
        <span
          data-testid="hq-join-status"
          className="ms-auto inline-flex shrink-0 items-center gap-1.5 rounded-full border-2 border-neo-lime/70 px-2 py-0.5 font-neo-display text-[0.65rem] font-black uppercase tracking-wide text-neo-lime sm:text-xs"
        >
          <span className="relative flex size-2">
            {reduced ? null : (
              <m.span
                aria-hidden="true"
                className="absolute inset-0 rounded-full bg-neo-lime"
                animate={{ scale: [1, 2.2], opacity: [0.7, 0] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut" }}
              />
            )}
            <span className="relative size-2 rounded-full bg-neo-lime" />
          </span>
          {t("academy.hq.codeReady", "Code ready")}
        </span>
      }
    >
      <div className="flex min-h-0 flex-1 flex-col gap-2 p-2 sm:gap-3 sm:p-3 lg:p-4">
        {/* THE hero of this card: the code, read from the back row. */}
        <div className="flex shrink-0 flex-col items-center justify-center rounded-neo border-3 border-neo-yellow bg-neo-navy px-2 py-1 shadow-hard-sm lg:py-2">
          <span className="font-neo-display text-[0.65rem] font-black uppercase tracking-widest text-neo-yellow/75 lg:text-sm">
            {t("academy.hq.classCode", "Class code")}
          </span>
          <span
            data-testid="hq-join-code"
            dir="ltr"
            className="select-all whitespace-nowrap font-mono text-5xl font-black leading-none tracking-[0.1em] text-neo-yellow sm:text-6xl lg:text-7xl 2xl:text-8xl"
          >
            {classroom.join_code}
          </span>
          {shortUrl ? (
            <span
              dir="ltr"
              className="mt-1 hidden max-w-full truncate font-mono text-sm font-bold text-neo-white/70 lg:block"
            >
              {shortUrl}
            </span>
          ) : null}
        </div>

        {/* Everything else is secondary, one quiet row of equals. */}
        <div data-testid="hq-join-actions" className="grid shrink-0 grid-cols-3 gap-2">
          <button
            type="button"
            data-testid="hq-copy-link"
            onClick={copyLink}
            className={SECONDARY}
          >
            {copied ? (
              <Check className="size-4 shrink-0 text-neo-lime" strokeWidth={3} aria-hidden="true" />
            ) : (
              <Link2 className="size-4 shrink-0 text-neo-lime" strokeWidth={3} aria-hidden="true" />
            )}
            <span className="line-clamp-2 min-w-0">{t("academy.hq.copyLink", "Copy link")}</span>
          </button>
          {/* The QR a phone in the room scans lives on the projector; here it
              is a small thumbnail (desktop) or an icon (phone) that opens it. */}
          <button
            type="button"
            data-testid="hq-open-qr"
            onClick={openProjector}
            aria-label={t("academy.hq.showQr", "Show QR code")}
            className={SECONDARY}
          >
            {joinUrl ? (
              <span className="hidden size-9 shrink-0 rounded-sm bg-neo-white p-0.5 lg:block">
                <QRCodeSVG
                  value={joinUrl}
                  size={64}
                  level="L"
                  style={{ width: "100%", height: "100%" }}
                  aria-hidden="true"
                />
              </span>
            ) : null}
            <QrCode
              className={cn("size-4 shrink-0 text-neo-cyan", joinUrl && "lg:hidden")}
              strokeWidth={2.5}
              aria-hidden="true"
            />
            <span className="line-clamp-2 min-w-0">{t("academy.hq.qr", "QR")}</span>
          </button>
          <button
            type="button"
            data-testid="hq-open-projector"
            onClick={openProjector}
            className={SECONDARY}
          >
            <MonitorUp className="size-4 shrink-0 text-neo-pink" strokeWidth={3} aria-hidden="true" />
            <span className="line-clamp-2 min-w-0">{t("academy.hq.openProjector", "Open projector")}</span>
          </button>
        </div>

        {/* Who is in. Desktop spends the QR's old space on a real roster. */}
        <div
          className={cn(
            "flex shrink-0 rounded-neo border-2 border-neo-cream/60 bg-neo-navy/70 px-2 py-1.5",
            "lg:min-h-0 lg:flex-1 lg:flex-col lg:gap-3 lg:overflow-hidden lg:p-3",
            waiting ? "items-center" : "items-center justify-between gap-2 lg:items-stretch lg:justify-start",
          )}
        >
          {waiting ? (
            <div
              data-testid="hq-roster-waiting"
              className="flex w-full min-w-0 items-center gap-3 lg:h-full lg:flex-col lg:justify-center lg:gap-4"
            >
              <span className="relative flex size-10 shrink-0 items-center justify-center lg:size-20">
                {reduced
                  ? null
                  : [0, 0.8].map((delay) => (
                      <m.span
                        key={delay}
                        aria-hidden="true"
                        className="absolute inset-0 rounded-full border-2 border-neo-cyan"
                        animate={{ scale: [1, 1.9], opacity: [0.8, 0] }}
                        transition={{ duration: 1.6, delay, repeat: Infinity, ease: "easeOut" }}
                      />
                    ))}
                <span className="relative flex size-full items-center justify-center rounded-full border-3 border-neo-black bg-neo-cyan shadow-hard-sm">
                  <UsersRound className="size-5 text-black lg:size-10" strokeWidth={3} aria-hidden="true" />
                </span>
              </span>
              <JoinedCount
                loading={rosterLoading}
                count={count}
                shown={shownCount}
                reduced={reduced}
                label={t("academy.hq.joinedLabel", "joined")}
                empty={t("academy.hq.nobodyYet", "No one yet — share the code")}
              />
              {/* Claims no count, so it is honest while the read is open too. */}
              <p className="hidden max-w-sm text-center font-neo-body text-sm font-bold text-neo-white/60 lg:block">
                {t("teacher.activation.shareBody")}
              </p>
            </div>
          ) : (
            <>
              <RosterSeats
                students={students}
                arrivals={arrivals}
                reduced={reduced}
                // Phone: one row with a few empty chairs. Desktop: every
                // student, named — no empty chairs at all.
                seats={wide ? Math.min(Math.max(count, 1), 15) : 5}
                size={wide ? 64 : 34}
                showNames={wide}
                className="lg:order-2 lg:min-h-0 lg:overflow-hidden lg:gap-3"
              />
              {/* Desktop: the rest of the panel says where newcomers appear. */}
              <p className="hidden font-neo-body text-sm font-bold text-neo-white/60 lg:order-3 lg:mt-auto lg:block">
                {t("teacher.activation.shareBody")}
              </p>
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
      </div>
    </JoinCardFrame>
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
      className="flex min-w-0 items-baseline gap-1.5 font-neo-display text-xs font-black uppercase leading-tight text-neo-white sm:text-sm lg:text-base"
    >
      {loading ? (
        <span className="text-2xl text-neo-white/50 lg:text-4xl">…</span>
      ) : (
        <>
          <AnimatePresence initial={false} mode="popLayout">
            <m.span
              key={shown}
              initial={reduced ? false : { scale: 1.8, y: -4 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 600, damping: 18 }}
              className={cn(
                "inline-block shrink-0 text-2xl tabular-nums lg:text-4xl",
                count > 0 ? "text-neo-lime" : "text-neo-white/60",
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
