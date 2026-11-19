"use client";

/** The one student waiting stage: practice fills it, READY is pinned under it, and the bar always says what comes next. */
import { useEffect, useState } from "react";
import { Lock, LogOut, Pencil, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ClassroomWaitingStageProps } from "@/components/education/lobby/ClassroomWaitingStage";
import { WaitingWarmUp } from "@/components/education/lobby/WaitingWarmUp";
import { useStudyDeck } from "@/lib/education/studyDeckStore";
import { LobbyLearnRecall, canRecall } from "./LobbyLearnRecall";
import { LIVE_KEYFRAMES, PRESS } from "./eduLiveStyles";
import { EduStudentLobbyCrowd } from "./EduStudentLobbyCrowd";
import { EduStudentLobbyFold } from "./EduStudentLobbyFold";
import { EduStudentLobbyHud } from "./EduStudentLobbyHud";
import { AcademyBackdrop } from "@/components/student/academy/AcademyBackdrop";

const STICKER_KEYFRAMES =
  "@keyframes edu-sticker-slap{0%{transform:rotate(-30deg) scale(2)}100%{transform:rotate(-8deg) scale(1)}}";

// A 40-word deck with clean spelling can outlast the teacher's patience, and READY is only advisory on the server.
export const STUDY_SKIP_AFTER_MS = 30_000;

export function EduStudentLobby({
  username,
  avatar,
  onEditAvatar,
  nameSlot,
  readySlot,
  statusSlot,
  emoteSlot,
  quickPickSlot,
  instructionsSlot,
  classmates,
  onExit,
  isReady = false,
  t,
}: ClassroomWaitingStageProps) {
  const others = classmates.filter((c) => c.username !== username);
  const classSize = others.length + 1;
  const { cards, studied, markStudied } = useStudyDeck();
  const [skipOffered, setSkipOffered] = useState(false);
  const [skipped, setSkipped] = useState(false);
  const locked = cards.length > 0 && !studied && !isReady && !skipped;

  useEffect(() => {
    if (!locked) return undefined;
    const timer = window.setTimeout(() => setSkipOffered(true), STUDY_SKIP_AFTER_MS);
    return () => window.clearTimeout(timer);
  }, [locked]);

  const waitingKey = locked
    ? "eduLiveRoom.student.waitPractice"
    : readySlot && !isReady
      ? "eduLiveRoom.student.waitReady"
      : "academy.waiting.forTeacher";

  return (
    <div
      data-testid="edu-student-lobby"
      className="relative isolate flex min-h-0 flex-1 flex-col overflow-hidden bg-neo-navy text-neo-cream"
    >
      <AcademyBackdrop art="arena" />
      <style>{LIVE_KEYFRAMES + STICKER_KEYFRAMES}</style>
      <header className="flex shrink-0 items-center justify-between gap-3 pe-16 ps-4 pt-3">
        <span
          data-testid="edu-student-count"
          className="inline-flex items-center gap-1.5 rounded-full border-[3px] border-neo-black bg-neo-cyan px-3 py-1 font-neo-display text-sm font-black text-neo-black shadow-hard-sm"
        >
          <Users className="size-4" aria-hidden="true" />
          {t("eduLiveRoom.student.inClass", { count: classSize })}
        </span>
        <button
          type="button"
          data-testid="edu-student-leave"
          onClick={onExit}
          aria-label={t("eduLiveRoom.student.leave")}
          className={cn(
            "inline-flex min-h-11 items-center gap-1.5 rounded-neo border-[3px] border-neo-cream bg-neo-navy-elevated px-3 font-neo-display text-sm font-black uppercase text-neo-cream shadow-hard-sm hover:bg-neo-navy-light",
            PRESS,
          )}
        >
          <LogOut className="size-4 rtl:-scale-x-100" aria-hidden="true" />
          {t("eduLiveRoom.student.leave")}
        </button>
      </header>

      <main className="relative flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-3 [container-type:size]">
        <div
          data-testid="edu-student-panel"
          className="mx-auto my-auto grid w-full max-w-lg shrink-0 grid-cols-1 gap-4 rounded-neo-lg border-4 border-neo-cream bg-neo-navy-light p-4 shadow-hard-lg lg:max-w-5xl lg:grid-cols-[minmax(0,1fr)_20rem] lg:grid-rows-[auto_1fr] lg:gap-x-10 lg:p-8 tv:max-w-6xl"
        >
          <div className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 lg:col-start-2 lg:row-start-1 lg:self-start">
            <div className="relative row-span-2 shrink-0">
              <button
                type="button"
                data-testid="edu-student-edit-avatar"
                onClick={onEditAvatar}
                aria-label={t("eduLiveRoom.student.changeLook")}
                className={cn(
                  "relative block size-16 overflow-hidden rounded-full border-4 border-neo-black bg-neo-cream shadow-hard [&_svg]:h-full [&_svg]:w-full lg:size-20",
                  PRESS,
                  isReady && "ring-4 ring-neo-lime",
                )}
              >
                {avatar}
                <span
                  aria-hidden="true"
                  className="absolute bottom-0 end-0 grid size-6 place-items-center rounded-full border-2 border-neo-black bg-neo-yellow text-neo-black"
                >
                  <Pencil className="size-3" />
                </span>
              </button>
              {isReady && (
                <span
                  data-testid="edu-student-ready-sticker"
                  className="pointer-events-none absolute inset-x-0 -top-3 mx-auto w-max rotate-[-8deg] rounded-neo border-[3px] border-neo-black bg-neo-lime px-2 py-0.5 font-neo-display text-sm font-black uppercase text-neo-black shadow-hard-sm motion-safe:animate-[edu-sticker-slap_360ms_cubic-bezier(.34,1.56,.64,1)]"
                >
                  {t("eduStudent.lobby.readySticker")}
                </span>
              )}
            </div>
            <div className="col-start-2 row-start-1 min-w-0">
              <h1 className="font-neo-display text-sm font-black uppercase tracking-wide text-neo-lime">
                {t("eduLiveRoom.student.youreIn")}
              </h1>
              <div className="min-w-0 font-neo-display text-2xl font-black leading-tight [overflow-wrap:anywhere]">
                {nameSlot}
              </div>
            </div>
            <EduStudentLobbyHud t={t} />
          </div>

          <section
            data-testid="edu-student-practice"
            className="min-w-0 lg:col-start-1 lg:row-span-2 lg:row-start-1"
          >
            {cards.length > 0 ? (
              <LobbyLearnRecall
                cards={cards}
                studied={studied}
                onDone={markStudied}
                quiet={!locked && !studied}
                username={username}
                t={t}
              />
            ) : (
              <WaitingWarmUp username={username} t={t} hero />
            )}
          </section>

          <div className="flex min-w-0 flex-col lg:col-start-2 lg:row-start-2">
            <EduStudentLobbyCrowd others={others} statusSlot={statusSlot} t={t} />
            {(quickPickSlot || emoteSlot) && (
              <EduStudentLobbyFold testId="edu-student-look" label={t("eduLiveRoom.student.changeLook")}>
                {quickPickSlot}
                {emoteSlot}
              </EduStudentLobbyFold>
            )}
            {instructionsSlot}
          </div>
        </div>
      </main>

      <footer
        data-testid="edu-student-lobby-bar"
        className="shrink-0 border-t-[3px] border-neo-cream bg-neo-navy-light px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3"
      >
        <div className="mx-auto flex w-full max-w-lg flex-col gap-2">
          <p
            data-testid="edu-student-waiting"
            role="status"
            className="text-center font-neo-body text-sm font-bold leading-snug text-neo-cream lg:text-base"
          >
            {t(waitingKey)}
          </p>
          {locked ? (
            <>
              <p
                data-testid="study-ready-locked"
                className="flex min-h-14 items-center justify-center gap-2 rounded-neo border-[3px] border-dashed border-neo-cream/50 px-3 py-2 text-center font-neo-display text-base font-bold text-neo-cream"
              >
                <Lock className="size-5 shrink-0" aria-hidden="true" />
                {t(
                  canRecall(cards)
                    ? "eduStudent.recall.readyLocked"
                    : "eduStudent.lobby.studyReadyLocked",
                  { count: cards.length },
                )}
              </p>
              {skipOffered && (
                <button
                  type="button"
                  data-testid="study-skip"
                  onClick={() => setSkipped(true)}
                  className={cn(
                    "min-h-11 rounded-neo font-neo-display text-base font-black text-neo-cream underline underline-offset-4",
                    PRESS,
                  )}
                >
                  {t("eduLiveRoom.student.skipPractice")}
                </button>
              )}
            </>
          ) : (
            readySlot
          )}
        </div>
      </footer>
    </div>
  );
}

export default EduStudentLobby;
