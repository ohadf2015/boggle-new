"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import toast from "react-hot-toast";
import { AnimatePresence, m } from "framer-motion";
import { Check, Link2, MonitorUp, QrCode, UsersRound } from "lucide-react";
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

const ACTION =
  "inline-flex min-h-11 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-neo border-3 border-neo-black px-2 py-1.5 font-neo-display text-xs font-black uppercase tracking-wide text-black shadow-hard-sm transition-all hover:-translate-y-0.5 hover:shadow-hard active:translate-y-0.5 active:shadow-hard-pressed focus:outline-hidden focus-visible:ring-4 focus-visible:ring-neo-cyan sm:text-sm lg:min-h-12 lg:text-base";

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

  return (
    <section
      data-testid="hq-get-students-in"
      aria-labelledby="hq-get-students-heading"
      className={cn(
        "flex min-h-0 flex-col overflow-hidden rounded-neo-lg border-3 border-neo-cream bg-neo-navy-light/95 shadow-hard-xl",
        className,
      )}
    >
      <div className="flex shrink-0 items-center gap-2 border-b-3 border-neo-black bg-neo-cyan px-3 py-1.5 sm:px-4 sm:py-2">
        <UsersRound
          className="size-5 shrink-0 text-black lg:size-6"
          strokeWidth={3}
          aria-hidden="true"
        />
        <h2
          id="hq-get-students-heading"
          className="min-w-0 truncate font-neo-display text-lg font-black uppercase leading-none tracking-tight text-black sm:text-2xl"
        >
          {t("academy.hq.getStudentsIn", "Get students in")}
        </h2>
        <span className="ms-auto min-w-0 max-w-[40%] truncate font-neo-body text-xs font-bold text-black/70 lg:text-sm">
          {classroom.name}
        </span>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-2 p-2 sm:gap-3 sm:p-3 lg:p-4">
        {/* The code: the one thing the back row has to read. */}
        <div className="flex shrink-0 items-stretch gap-2">
          <div className="flex min-w-0 flex-1 flex-col items-center justify-center rounded-neo border-3 border-neo-black bg-neo-yellow px-2 py-1 shadow-hard lg:py-3">
            <span className="font-neo-display text-[0.65rem] font-black uppercase tracking-widest text-black/70 lg:text-sm">
              {t("academy.hq.classCode", "Class code")}
            </span>
            <span
              data-testid="hq-join-code"
              dir="ltr"
              className="select-all whitespace-nowrap font-mono text-5xl font-black leading-none tracking-[0.1em] text-black sm:text-6xl lg:text-7xl 2xl:text-8xl"
            >
              {classroom.join_code}
            </span>
          </div>
          {/* A phone teacher opens the projector for the QR; desktop shows it below. */}
          <button
            type="button"
            data-testid="hq-open-qr"
            onClick={openProjector}
            aria-label={t("academy.hq.showQr", "Show QR code")}
            className="flex w-16 shrink-0 flex-col items-center justify-center gap-0.5 rounded-neo border-3 border-neo-black bg-neo-white font-neo-display text-[0.6rem] font-black uppercase text-black shadow-hard-sm transition-all hover:-translate-y-0.5 active:translate-y-0.5 lg:hidden"
          >
            <QrCode className="size-8" strokeWidth={2.5} aria-hidden="true" />
            {t("academy.hq.qr", "QR")}
          </button>
        </div>

        {/* Desktop: the QR beside the link, sized by the height the deck
            leaves — it grows into the card instead of floating in a gap. */}
        <div className="hidden min-h-0 flex-1 items-center gap-4 lg:flex">
          {joinUrl ? (
            <div className="aspect-square h-full max-h-full min-h-0 shrink-0 rounded-neo border-3 border-neo-black bg-neo-white p-2 shadow-hard">
              <QRCodeSVG
                value={joinUrl}
                size={320}
                level="M"
                style={{ width: "100%", height: "100%" }}
                aria-label={t("academy.hq.qrLabel", "QR code to join")}
              />
            </div>
          ) : null}
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <span className="font-neo-display text-xl font-black uppercase leading-none tracking-tight text-neo-white xl:text-2xl">
              {t("academy.hq.scanToJoin", "Scan to join")}
            </span>
            <span className="font-neo-body text-sm font-bold text-neo-white/70">
              {t(
                "academy.teacher.orTypeCode",
                "or open the link and type the code",
              )}
            </span>
            <p
              dir="ltr"
              className="break-all font-mono text-sm font-bold text-neo-lime xl:text-base"
            >
              {shortUrl}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            data-testid="hq-copy-link"
            onClick={copyLink}
            className={cn(ACTION, "bg-neo-lime")}
          >
            {copied ? (
              <Check
                className="size-4 shrink-0"
                strokeWidth={3}
                aria-hidden="true"
              />
            ) : (
              <Link2
                className="size-4 shrink-0"
                strokeWidth={3}
                aria-hidden="true"
              />
            )}
            <span className="truncate">
              {t("academy.hq.copyLink", "Copy link")}
            </span>
          </button>
          <button
            type="button"
            data-testid="hq-open-projector"
            onClick={openProjector}
            className={cn(ACTION, "bg-neo-pink")}
          >
            <MonitorUp
              className="size-4 shrink-0"
              strokeWidth={3}
              aria-hidden="true"
            />
            <span className="truncate">
              {t("academy.hq.openProjector", "Open projector")}
            </span>
          </button>
        </div>

        <div className="flex shrink-0 items-center justify-between gap-2 rounded-neo border-2 border-neo-cream/60 bg-neo-navy/70 px-2 py-1.5">
          <RosterSeats
            students={students}
            arrivals={arrivals}
            reduced={reduced}
            seats={wide ? 6 : 5}
            size={wide ? 44 : 34}
          />
          <p
            data-testid="hq-joined-count"
            aria-live="polite"
            className="min-w-0 text-end font-neo-display text-xs font-black uppercase leading-tight text-neo-white sm:text-sm"
          >
            {rosterLoading ? (
              // Pessimistic: neither "nobody yet" nor a number until the
              // first read settles (pitfall class 1).
              <span className="text-neo-white/50">…</span>
            ) : count > 0 ? (
              <>
                <AnimatePresence initial={false} mode="popLayout">
                  <m.span
                    key={shownCount}
                    initial={reduced ? false : { scale: 1.8, y: -4 }}
                    animate={{ scale: 1, y: 0 }}
                    transition={{ type: "spring", stiffness: 600, damping: 18 }}
                    className="inline-block text-2xl text-neo-lime tabular-nums lg:text-3xl"
                  >
                    {shownCount}
                  </m.span>
                </AnimatePresence>{" "}
                {t("academy.hq.joinedLabel", "joined")}
              </>
            ) : (
              t("academy.hq.nobodyYet", "No one yet — share the code")
            )}
          </p>
        </div>
      </div>
    </section>
  );
}

export default GetStudentsInCard;
