"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { m } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import { X } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { classroomJoinUrl, joinAddressForDisplay } from "@/lib/education/classroomInvitePayload";
import { useClassRoster } from "./useClassRoster";
import { RosterSeats } from "./RosterSeats";
import { useHqJuice } from "./useHqJuice";
import type { HqClassroom } from "./GetStudentsInCard";

export interface HqProjectorSheetProps {
  classroom: HqClassroom;
  onClose: () => void;
}

/**
 * "Open projector": the class code at back-row size as letter tiles, one QR,
 * and the seats filling as students join, on the sky page.
 * Portalled to <body> so no transformed ancestor can re-anchor `fixed`.
 */
export function HqProjectorSheet({
  classroom,
  onClose,
}: HqProjectorSheetProps) {
  const { t, language } = useLanguage();
  const { reduced, sfx } = useHqJuice();
  const { students, arrivals } = useClassRoster(
    classroom.id,
    t("teacher.classrooms.students.unknown"),
  );
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
    sfx.playMenuOpenSound();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per open
  }, [onClose]);

  useEffect(() => {
    if (arrivals.length) sfx.playPlayerJoinedSound();
  }, [arrivals, sfx]);

  const joinUrl = classroomJoinUrl(origin || "", language, classroom.join_code);
  const address = joinAddressForDisplay(joinUrl);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="hq-projector-title"
      data-hq-sheet="projector"
      className="fixed inset-0 z-[120] flex flex-col overflow-hidden bg-edu-page"
    >
      <button
        type="button"
        data-testid="hq-projector-close"
        onClick={onClose}
        aria-label={t("common.close")}
        className="absolute end-4 top-[max(1rem,env(safe-area-inset-top))] z-10 flex size-12 items-center justify-center rounded-neo border-[3px] border-neo-black bg-edu-surface text-neo-black shadow-edu-lip-sm"
      >
        <X className="size-6" strokeWidth={3} aria-hidden="true" />
      </button>

      <m.div
        initial={reduced ? false : { scale: 0.9, y: 16 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 380, damping: 26 }}
        className="relative z-[1] m-auto flex w-full max-w-[min(92vw,1400px)] flex-col items-center gap-[2.5vh] px-4 text-center"
      >
        <h2
          id="hq-projector-title"
          className="font-neo-display text-3xl font-black tracking-tight text-edu-ink [overflow-wrap:anywhere] sm:text-5xl"
        >
          {t("academy.hq.projectorTitle", "Join {name}", {
            name: classroom.name,
          })}
        </h2>

        <div
          data-testid="hq-projector-code-card"
          className="edu-card flex w-full flex-col items-center gap-[2.5vh] px-[3vw] py-[3vh] md:flex-row md:justify-center md:gap-[3vw]"
        >
          <div className="flex min-w-0 flex-col items-center gap-[2vh]">
            <p className="font-neo-display text-base font-black text-edu-ink/75 sm:text-2xl">
              {t("academy.hq.classCode", "Class code")}
            </p>
            <p dir="ltr" className="flex gap-[0.8vw]">
              {[...classroom.join_code].map((ch, i) => (
                <span
                  key={i}
                  data-testid="hq-projector-code-tile"
                  className="edu-tile size-[clamp(2.75rem,min(5.5vw,10vh),6.5rem)] text-[clamp(1.75rem,min(4vw,7.5vh),4.75rem)] leading-none"
                >
                  {ch}
                </span>
              ))}
            </p>
            <p
              data-testid="hq-projector-address"
              dir="ltr"
              className="rounded-neo-lg border-[3px] border-neo-black bg-neo-pink px-4 py-1.5 font-neo-display text-lg font-black text-neo-black shadow-edu-lip-sm sm:text-3xl"
            >
              {address}
            </p>
          </div>
          {origin ? (
            <div
              data-testid="hq-projector-qr"
              className="shrink-0 rounded-neo-lg border-[3px] border-neo-black bg-edu-paper p-3 shadow-edu-lip-sm"
            >
              <QRCodeSVG
                value={joinUrl}
                size={220}
                level="M"
                className="size-[min(30vw,32vh)]"
              />
            </div>
          ) : null}
        </div>

        <div className="flex flex-col items-center gap-2">
          <RosterSeats
            students={students}
            arrivals={arrivals}
            reduced={reduced}
            seats={10}
            size={52}
            className="max-w-full flex-wrap justify-center"
          />
          <p className="font-neo-display text-lg font-black text-edu-ink sm:text-2xl">
            {students.length > 0
              ? `${students.length} ${t("academy.hq.joinedLabel", "joined")}`
              : t("academy.hq.nobodyYet", "No one yet — share the code")}
          </p>
        </div>
      </m.div>
    </div>,
    document.body,
  );
}

export default HqProjectorSheet;
