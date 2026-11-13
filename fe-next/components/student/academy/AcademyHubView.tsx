'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import posthog from '@/lib/analytics/lazyPosthog';
import { useLanguage } from '@/contexts/LanguageContext';
import { useEduReducedMotion } from '@/lib/education/motion/useEduReducedMotion';
import type { ActiveGame } from '@/hooks/useActiveClassroomGame';
import type { ClassroomReward } from '@/hooks/useClassroomRewardListener';
import type { VocabularyLevel } from '@/lib/supabase/education/types';
import type { CustomAvatarConfig } from '@/shared/types/customAvatar';
import { ISLANDS } from './academyNodes';
import { buildAcademyIslands, pickNextAction, type AcademyIsland } from './academyIslands';
import type { AcademyData } from './useAcademyData';
import { AcademyHud } from './AcademyHud';
import { AcademyMap, useRegionSize } from './AcademyMap';
import { pickMapArt, showMascot, useHubLayout } from './hubLayout';
import { useChromeInsets } from './useChromeInsets';
import { AcademyCta, ctaTone, useCtaOverline } from './AcademyCta';
import { academyMascotMood } from './academyMascotMood';
import { AcademyMascot } from './AcademyMascot';
import { AcademySidePanel } from './AcademySidePanel';
import { AcademyDock } from './AcademyDock';
import { DailyChest } from './DailyChest';
import StudentLocker from '@/components/education/economy/StudentLocker';
import GameFeedback from '@/components/feedback/GameFeedback';
import { ClassSheet } from './ClassSheet';
import { HubTopCards } from './HubTopCards';
import { studentWarmup } from './todayItems';
import { canOpenChest } from './dailyChestStore';
import { buildFirstDayGoals } from './firstDayGoals';
import { nextOpenAssignment } from '@/components/student/nextOpenAssignment';
import { shouldOpenClassSheet } from './classSheetDeepLink';
import {
  classifyAssignmentDue,
  isOverdueNudgeDue,
  markOverdueNudged,
} from '@/lib/education/assignmentDueReminder';
import { HubToast, type HubNote as Note } from './HubToast';
import { NoClassPanel } from './NoClassPanel';
import { ClassroomAutoJoinNotice } from './ClassroomAutoJoinNotice';
import { useNodeLabel } from './AcademyNodeButton';
import { cn } from '@/lib/utils';
import { studentPracticeHref } from '@/lib/navigation/eduExitTargets';

export interface AcademyHubProps {
  userId: string;
  studentName: string;
  classroomId: string | null;
  classroomName?: string | null;
  classrooms?: { id: string; name: string }[];
  onSelectClassroom?: (id: string) => void;
  level?: VocabularyLevel | null;
  avatarConfig?: CustomAvatarConfig | null;
  profileXp: number;
  isGuest: boolean;
  onSignOut: () => void;
  /** The classroom lookup has not answered yet — render nothing that a late answer could flip. */
  classroomLoading?: boolean;
}

export interface AcademyHubViewProps extends AcademyHubProps {
  data: AcademyData;
  liveGame: ActiveGame | null;
  join: () => void;
  /** Counting down to joining the class's live game; the live button still joins now. */
  autoJoinPending?: boolean;
  onStayHere?: () => void;
  isJoining: boolean;
  joinError: string | null;
  reward: ClassroomReward | null;
  clearReward: () => void;
}


const CHEST_COVER_DELAY_MS = 180;

export function AcademyHubView(props: AcademyHubViewProps) {
  const { userId, studentName, classroomId, classroomName, classrooms, onSelectClassroom, level, avatarConfig, profileXp, isGuest, onSignOut, classroomLoading } = props;
  const { data, liveGame, join, isJoining, joinError, reward, clearReward } = props;
  const { t, language, dir } = useLanguage();
  const router = useRouter();
  const reducedMotion = useEduReducedMotion();
  const hub = useHubLayout();
  const wide = hub.chrome === 'wide';
  const rail = hub.chrome === 'rail';
  const zoom: CSSProperties | undefined = hub.scale !== 1 ? { zoom: hub.scale } : undefined;
  const topRef = useRef<HTMLDivElement>(null);
  // The map keeps animating under the 95% chest overlay unless its rendering is skipped while the reveal covers it.
  const hubRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [classOpen, setClassOpen] = useState(false);
  // A fresh join lands here as /student?class=open — open the class sheet on
  // mount so the next open assignment (already computed below for ClassSheet)
  // is one tap away. Re-runs when the classroom resolves late.
  const searchParams = useSearchParams();
  useEffect(() => {
    if (shouldOpenClassSheet(searchParams, classroomId)) setClassOpen(true);
  }, [searchParams, classroomId]);
  const [grantedXp, setGrantedXp] = useState<number | null>(null);
  // Hidden a beat after the reveal shows, so the two restyles never share the tap's frame.
  const coverTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const onChestCover = useCallback((covering: boolean) => {
    clearTimeout(coverTimer.current);
    if (covering) coverTimer.current = setTimeout(() => hubRef.current?.setAttribute('data-covered', ''), CHEST_COVER_DELAY_MS);
    else requestAnimationFrame(() => hubRef.current?.removeAttribute('data-covered'));
  }, []);
  useEffect(() => () => clearTimeout(coverTimer.current), []);
  const [note, setNote] = useState<Note>(null);
  const isLive = !!liveGame?.gameCode;

  // Pessimistic until every source answers: a student with a class must never
  // see "Join a classroom" or a half-built map flash first (pitfall class 1).
  const ready = !classroomLoading && (!data.lessonsLoading || data.lessons.length > 0) && !data.reviewPending;
  const noClass = ready && !classroomId;
  const insets = useChromeInsets(hubRef, topRef, bottomRef, [hub.chrome, hub.scale, hub.sideCard, ready]);
  const hubSize = useRegionSize(hubRef);
  const layout = pickMapArt(hub.art, hubSize, insets);

  // After the class read answers: a loading hub has no id yet even for a student with a class.
  useEffect(() => {
    if (classroomLoading) return;
    posthog.capture('student_academy_viewed', { has_class: !!classroomId });
  }, [classroomId, classroomLoading]);

  useEffect(() => {
    if (!reward) return;
    const timer = setTimeout(() => clearReward(), 5000);
    return () => clearTimeout(timer);
  }, [reward, clearReward]);

  // The class-feedback bubble must outlive the 5-second reward toast it shares
  // a moment with: remember the first round that paid out this visit. The
  // shared feedback budget (useGameFeedback) decides whether it renders at all.
  const [playedGameCode, setPlayedGameCode] = useState<string | null>(null);
  useEffect(() => {
    if (reward?.gameCode) setPlayedGameCode((prev) => prev ?? reward.gameCode);
  }, [reward]);

  useEffect(() => {
    if (!note) return;
    const timer = setTimeout(() => setNote(null), 4000);
    return () => clearTimeout(timer);
  }, [note]);

  const { islands, boss } = useMemo(
    () =>
      buildAcademyIslands({
        lessons: data.lessons,
        locale: language,
        level,
        hasClass: !!classroomId,
        live: isLive,
        reviewLessonId: data.reviewLessonId,
        reviewCount: data.reviewCount,
        slots: ISLANDS[layout].length,
      }),
    [data.lessons, data.reviewLessonId, data.reviewCount, language, level, classroomId, isLive, layout],
  );
  const action = pickNextAction({ hasClass: !!classroomId, live: isLive, islands, boss });
  const nextAssignment = useMemo(
    () => nextOpenAssignment(data.lessons, language, classroomId),
    [data.lessons, language, classroomId],
  );
  const warmup = useMemo(() => studentWarmup(data.lessons, language, classroomId), [data.lessons, language, classroomId]);
  // Due-soon card: the next open assignment lands within 24h. Overdue nudge:
  // only when its once-per-day throttle allows it; marking happens in the
  // effect below, after the card has actually mounted.
  const dueCard = useMemo(() => {
    const dueDate = nextAssignment?.dueDate;
    if (!nextAssignment || !dueDate) return null;
    const kind = classifyAssignmentDue(dueDate);
    if (!kind) return null;
    if (kind === 'overdue') {
      const storage = typeof window !== 'undefined' ? window.localStorage : null;
      if (!isOverdueNudgeDue(storage, nextAssignment.assignmentId)) return null;
    }
    return { kind, dueDate };
  }, [nextAssignment]);
  useEffect(() => {
    if (!dueCard || dueCard.kind !== 'overdue' || !nextAssignment) return;
    const storage = typeof window !== 'undefined' ? window.localStorage : null;
    markOverdueNudged(storage, nextAssignment.assignmentId);
  }, [dueCard, nextAssignment]);
  const mascotMood = academyMascotMood({
    kind: action.kind,
    streakAtRisk: data.streakAtRisk,
    streak: data.streak,
    reviewCount: data.reviewCount,
  });
  const target = [...islands, ...(boss ? [boss] : [])].find((n) => n.key === action.nodeKey);
  const spotlightTag = useCtaOverline(action.kind);
  const firstDayGoals = useMemo(
    () => buildFirstDayGoals({ hasClass: !!classroomId, stars: data.stars, streak: data.streak }),
    [classroomId, data.stars, data.streak],
  );
  const targetLabel = useNodeLabel(target ?? { key: 'none', kind: 'lesson', type: 'lesson', state: 'open', stars: 0, mastery: 0 });

  // A late profile value must never roll the bar back below what the chest granted.
  const totalXp = Math.max(profileXp, grantedXp ?? 0);

  const openNode = useCallback(
    (node: AcademyIsland) => {
      posthog.capture('student_academy_node_clicked', { type: node.kind, state: node.state });
      if (node.kind === 'arena') {
        if (node.state === 'live') join();
        else setNote((prev) => ({ kind: 'arena', tap: prev?.kind === 'arena' ? (prev.tap ?? 0) + 1 : 0 }));
        return;
      }
      if (node.kind === 'boss' && !node.href) {
        const p = node.progress ?? { have: 0, need: 0 };
        setNote((prev) => ({ kind: 'boss', left: Math.max(0, p.need - p.have), tap: prev?.kind === 'boss' ? (prev.tap ?? 0) + 1 : 0 }));
        return;
      }
      if (node.href) router.push(node.href);
    },
    [join, router],
  );

  const pageTitle = classroomName ?? (ready ? t('academy.student.title', 'Word Academy') : null);
  const chest = (
    <div className="flex items-center gap-2">
      <DailyChest
        userId={userId}
        reducedMotion={reducedMotion}
        size={wide ? 'md' : 'sm'}
        onGranted={(xp) => xp != null && setGrantedXp(xp)}
        onRevealChange={onChestCover}
      />
      <StudentLocker />
    </div>
  );

  const goSolo = () => router.push(studentPracticeHref(language));

  const pressCta = () => {
    posthog.capture('student_academy_cta_clicked', { kind: action.kind });
    if (action.kind === 'live') join();
    else if (action.kind === 'join-class') router.push(`/${language}/student/join`);
    else if (action.kind === 'solo') goSolo();
    else if (target?.href) router.push(target.href);
  };

  const hud = (
    <AcademyHud
      userId={userId}
      name={studentName}
      avatarConfig={avatarConfig}
      totalXp={totalXp}
      streak={data.streak}
      streakAtRisk={data.streakAtRisk}
      stars={data.stars}
      isGuest={isGuest}
      onSignOut={onSignOut}
      reducedMotion={reducedMotion}
      title={classroomName ?? null}
      size={rail ? 'compact' : wide ? 'wide' : 'normal'}
    />
  );

  return (
    <div
      dir={dir}
      data-testid="academy-hub"
      data-chrome={hub.chrome}
      data-scale={hub.scale}
      ref={hubRef}
      className="fixed inset-x-0 top-0 bottom-[var(--cookie-consent-height,0px)] overflow-hidden bg-neo-navy text-neo-white [&[data-covered]>main]:[content-visibility:hidden]"
    >
      {/* Inline position: a global landscape-phone rule forces every <main> to relative. */}
      <main className="absolute inset-0" style={{ position: 'absolute', inset: 0 }} aria-label={t('academy.student.mapLabel', 'Academy map')}>
        <AcademyMap
          layout={layout}
          islands={ready ? islands : []}
          boss={ready ? boss : null}
          recommendedKey={ready ? action.nodeKey : null}
          spotlightTag={spotlightTag}
          spotlightTone={ctaTone(action.kind)}
          onOpen={openNode}
          reducedMotion={reducedMotion}
          insets={insets}
          big={wide}
          scale={hub.scale}
        />
      </main>

      {/* Top: ONE integrated HUD (who, class, level/XP, streak + stars in one tray). */}
      <div
        className={cn(
          'pointer-events-none absolute inset-x-0 top-0 z-20',
          rail
            ? 'ps-[max(0.5rem,env(safe-area-inset-left,0px))] pe-[max(0.5rem,env(safe-area-inset-right,0px))] pt-[calc(env(safe-area-inset-top,0px)+0.375rem)]'
            : 'px-3 pt-[calc(env(safe-area-inset-top,0px)+0.5rem)] sm:px-6 sm:pt-4',
        )}
      >
        <div style={zoom} className={rail ? 'flex items-start justify-between gap-3' : undefined}>
          <div ref={topRef} className={cn('pointer-events-auto', rail && 'min-w-0 max-w-md flex-1')}>
            {hud}
            {(ready || hub.chrome === 'stack') && !isLive && !noClass && (
              <HubTopCards
                lead={hub.chrome === 'stack' ? chest : undefined}
                ready={ready}
                oneCard={hub.chrome === 'stack'}
                goals={firstDayGoals}
                classroomId={classroomId}
                warmup={warmup}
                due={dueCard && nextAssignment ? { ...nextAssignment, ...dueCard } : null}
                chestOpen={canOpenChest(userId, new Date())}
                streak={data.streak}
                streakDoneToday={data.streakDoneToday}
              />
            )}
          </div>
          {/* Phone and tablet: the chest leads the card row (inside the measured top chrome).
              Phone on its side: at the far end of the top row, clear of the map's middle. */}
          {rail && <div className="pointer-events-auto flex shrink-0 pt-0.5 me-1">{chest}</div>}
        </div>
        <p className="sr-only">{t('student.dashboard.greeting', { name: studentName })}</p>
      </div>

      {noClass && (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center px-4 pb-28 pt-24">
          <NoClassPanel />
        </div>
      )}

      <HubToast reward={reward} note={note} onDismiss={clearReward} reducedMotion={reducedMotion} rail={rail} />

      {/* After playing a class round: one-tap sentiment that feeds class
          engagement evidence. Mid-screen, clear of the HUD above and the CTA. */}
      {playedGameCode && (
        <div className="absolute left-1/2 top-[42%] z-30 w-full max-w-xs -translate-x-1/2 px-3">
          <GameFeedback
            surface="class_round"
            eligible
            gameMode="classroom"
            language={language}
            throttleKey={playedGameCode}
          />
        </div>
      )}

      {/* Bottom. Phone: the ONE hero action over the dock. Phone on its side: hero
          and an icon dock share one row. Desktop: side card (start, when it fits)
          · hero · dock (end), all over the cloud band. */}
      <div
        className={cn(
          'absolute inset-x-0 bottom-0 z-20',
          rail
            ? 'ps-[max(0.5rem,env(safe-area-inset-left,0px))] pe-[max(0.5rem,env(safe-area-inset-right,0px))] pb-[calc(env(safe-area-inset-bottom,0px)+0.375rem)]'
            : 'px-3 pb-[calc(env(safe-area-inset-bottom,0px)+0.75rem)] sm:px-6 sm:pb-5',
        )}
      >
        <div
          ref={bottomRef}
          style={zoom}
          className={
            wide && hub.sideCard
              ? 'grid w-full grid-cols-[minmax(0,1fr)_minmax(0,40rem)_minmax(max-content,1fr)] items-end gap-5'
              : wide
                ? 'mx-auto flex w-full max-w-[64rem] items-end justify-center gap-5'
                : rail
                  ? 'mx-auto flex w-full max-w-3xl items-end gap-2'
                  : 'mx-auto flex w-full max-w-xl flex-col gap-2.5'
          }
        >
          {wide && hub.sideCard && (
            <div className="justify-self-start">
              {ready && pageTitle ? (
                <AcademySidePanel title={pageTitle} streak={data.streak} boss={boss} chest={chest} />
              ) : (
                chest
              )}
            </div>
          )}
          {wide && !hub.sideCard && <div className="shrink-0 pb-3">{chest}</div>}
          <div className={cn('pointer-events-none flex flex-col gap-1 [&>:last-child]:pointer-events-auto', wide && 'w-full', wide && !hub.sideCard && 'min-w-0 max-w-[40rem] flex-1', rail && 'min-w-0 flex-1')}>
            {!noClass && showMascot(hub.chrome, hubSize.height) && (ready
              ? <AcademyMascot mood={mascotMood} reducedMotion={reducedMotion} />
              : <div aria-hidden="true" data-testid="academy-mascot-slot" className="h-16" />)}
            {ready && isLive && props.autoJoinPending && props.onStayHere && <ClassroomAutoJoinNotice onStay={props.onStayHere} />}
            {noClass ? null : ready ? (
              <AcademyCta
                kind={action.kind}
                activeGame={liveGame}
                target={target}
                targetLabel={targetLabel}
                isJoining={isJoining}
                joinError={joinError}
                onPress={pressCta}
                reducedMotion={reducedMotion}
                size={wide ? 'big' : rail ? 'compact' : 'normal'}
              />
            ) : (
              <div
                data-testid="academy-cta-pending"
                aria-busy="true"
                className={cn(
                  'w-full animate-pulse rounded-[20px] border-3 border-neo-cream bg-neo-navy-light',
                  rail ? 'h-14' : wide ? 'h-[92px]' : 'h-[68px] sm:h-[76px]',
                )}
              />
            )}
          </div>
          <div className={cn(wide && 'shrink-0 justify-self-end', rail && 'shrink-0')}>
            <AcademyDock
              locale={language}
              reviewCount={data.reviewCount}
              onOpenClass={classroomId ? () => setClassOpen(true) : undefined}
              onSolo={!ready || action.kind !== 'solo' ? goSolo : undefined}
              big={wide}
              iconOnly={rail}
            />
          </div>
        </div>
      </div>

      {classOpen && classroomId && (
        <ClassSheet
          classroomId={classroomId}
          userId={userId}
          className={classroomName}
          classrooms={classrooms}
          onSelectClassroom={onSelectClassroom}
          onClose={() => setClassOpen(false)}
          reducedMotion={reducedMotion}
          nextOpenAssignment={nextAssignment}
        />
      )}
    </div>
  );
}
