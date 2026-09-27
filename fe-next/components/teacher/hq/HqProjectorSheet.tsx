"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { m } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import { X } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { classroomJoinUrl } from "@/lib/education/classroomInvitePayload";
import { useClassRoster } from "./useClassRoster";
import { RosterSeats } from "./RosterSeats";
import { useHqJuice } from "./useHqJuice";
import type { HqClassroom } from "./GetStudentsInCard";

export interface HqProjectorSheetProps {
  classroom: HqClassroom;
  onClose: () => void;
}

/**
 * "Open projector": the class code at back-row size on the arena art, one QR,
 * and the seats filling as students join. A dark-only surface — hardcoded
 * navy, never a cream/dark pair that flashes on lazy mount (pitfall class 5).
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
  const address = joinUrl.replace(/^https?:\/\//, "");

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="hq-projector-title"
      data-hq-sheet="projector"
      className="fixed inset-0 z-[120] flex flex-col overflow-hidden bg-neo-navy"
    >
      <Image
        src="/images/education/arena-lobby-bg.webp"
        alt=""
        aria-hidden="true"
        fill
        sizes="100vw"
        className="pointer-events-none select-none object-cover opacity-70"
      />
      <div className="absolute inset-0 bg-neo-navy/40" aria-hidden="true" />

      <button
        type="button"
        data-testid="hq-projector-close"
        onClick={onClose}
        aria-label={t("common.close")}
        className="absolute end-4 top-[max(1rem,env(safe-area-inset-top))] z-10 flex size-12 items-center justify-center rounded-neo border-3 border-neo-black bg-neo-cream text-black shadow-hard"
      >
        <X className="size-6" strokeWidth={3} aria-hidden="true" />
      </button>

      <m.div
        initial={reduced ? false : { scale: 0.9, y: 16 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 380, damping: 26 }}
        className="relative z-[1] m-auto flex w-full max-w-5xl flex-col items-center gap-[2.5vh] px-4 text-center"
      >
        <h2
          id="hq-projector-title"
          className="font-neo-display text-2xl font-black uppercase tracking-tight text-neo-white drop-shadow-[0_3px_0_#000] sm:text-4xl"
        >
          {t("academy.hq.projectorTitle", "Join {name}", {
            name: classroom.name,
          })}
        </h2>

        <div className="flex flex-col items-center gap-[3vw] md:flex-row">
          <div className="rounded-neo-xl border-4 border-neo-black bg-neo-yellow px-[4vw] py-[2vh] shadow-hard-2xl">
            <p className="font-neo-display text-sm font-black uppercase tracking-widest text-black/70 sm:text-lg">
              {t("academy.hq.classCode", "Class code")}
            </p>
            <p
              dir="ltr"
              className="font-mono text-[clamp(3rem,11vw,9rem)] font-black leading-none tracking-[0.1em] text-black"
            >
              {classroom.join_code}
            </p>
          </div>
          {origin ? (
            <div
              data-testid="hq-projector-qr"
              className="rounded-neo-lg border-4 border-neo-black bg-neo-white p-3 shadow-hard-xl"
            >
              <QRCodeSVG
                value={joinUrl}
                size={220}
                level="M"
                className="size-[min(38vw,30vh)]"
              />
            </div>
          ) : null}
        </div>

        <p
          data-testid="hq-projector-address"
          dir="ltr"
          className="rounded-neo border-3 border-neo-cream bg-neo-navy-light px-4 py-2 font-neo-body text-base font-black text-neo-white shadow-hard sm:text-2xl"
        >
          {address}
        </p>

        <div className="flex flex-col items-center gap-2">
          <RosterSeats
            students={students}
            arrivals={arrivals}
            reduced={reduced}
            seats={10}
            size={52}
          />
          <p className="font-neo-display text-lg font-black uppercase text-neo-lime sm:text-2xl">
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
