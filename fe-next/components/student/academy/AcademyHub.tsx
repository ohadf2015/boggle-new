'use client';

/**
 * Student home = the Academy Map. One screen, no scroll:
 *
 *   HUD plaque (who you are, level/XP, streak, stars) + class pennant + chest
 *   map (every island a real destination: lessons, Word Workshop, Missed
 *        Words Review, Class Arena; the castle is the lesson-mastery boss)
 *   ONE hero button bound to the recommended island (`pickNextAction`)
 *   dock (lessons, class standings, solo practice, awards, me)
 *
 * Data is the old hub's, rewired: the live-game socket (`useActiveClassroomGame`,
 * opened ONCE here), the acked join (`useClassroomGameJoin`, shared with the
 * banner), merged lessons, spaced-repetition review count, streak, and the
 * classroom reward toast.
 */

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import type { Socket } from 'socket.io-client';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { AnimatePresence, m, useReducedMotion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import posthog from '@/lib/analytics/lazyPosthog';
import { useLanguage } from '@/contexts/LanguageContext';
import { useReducedEffects } from '@/hooks/useReducedEffects';
import { useActiveClassroomGame, type ActiveGame } from '@/hooks/useActiveClassroomGame';
import { useClassroomRewardListener } from '@/hooks/useClassroomRewardListener';
import type { VocabularyLevel } from '@/lib/supabase/education/types';
import type { CustomAvatarConfig } from '@/shared/types/customAvatar';
import { useClassroomGameJoin } from '@/components/student/useClassroomGameJoin';
import { ISLANDS } from './academyNodes';
import { buildAcademyIslands, pickNextAction, type AcademyIsland } from './academyIslands';
import { useAcademyData } from './useAcademyData';
import { AcademyHud } from './AcademyHud';
import { AcademyMap } from './AcademyMap';
import { useHubLayout } from './hubLayout';
import type { Insets } from './artFit';
import { AcademyCta, ctaTone, useCtaOverline } from './AcademyCta';
import { AcademySidePanel } from './AcademySidePanel';
import { AcademyDock } from './AcademyDock';
import { DailyChest } from './DailyChest';
import { ClassSheet } from './ClassSheet';
import { InkPanel } from './chrome';
import { useNodeLabel } from './AcademyNodeButton';
import { cn } from '@/lib/utils';

export interface AcademyHubProps {
  userId: string;
  studentName: string;
  classroomId: string | null;
  classroomName?: string | null;
  level?: VocabularyLevel | null;
  avatarConfig?: CustomAvatarConfig | null;
  profileXp: number;
  isGuest: boolean;
  onSignOut: () => void;
  /** The classroom lookup has not answered yet — render nothing that a late answer could flip. */
  classroomLoading?: boolean;
}

type LiveState = { activeGame: ActiveGame | null; socket: Socket | null };
const NO_LIVE: LiveState = { activeGame: null, socket: null };

/**
 * The class's live-game socket exists only for a student who has a class. A
 * SIBLING of the hub body (not a wrapper), so the classroom resolving late
 * mounts this — it never remounts the map, its fetches or its entrances.
 */
function LiveGameBridge({ classroomId, onChange }: { classroomId: string; onChange: (s: LiveState) => void }) {
  const { activeGame, socket } = useActiveClassroomGame(classroomId);
  useEffect(() => { onChange({ activeGame, socket }); }, [activeGame, socket, onChange]);
  useEffect(() => () => onChange(NO_LIVE), [onChange]);
  return null;
}

type Note = { kind: 'arena' } | { kind: 'boss'; left: number } | null;

/** Breathing room between the chrome and the nearest island box, px. */
const CHROME_GAP = 8;

/**
 * How much of each edge the chrome covers, measured (visual px, zoom included)
 * so the islands are solved against the real HUD and bottom bar.
 */
function useChromeInsets(top: React.RefObject<HTMLElement | null>, bottom: React.RefObject<HTMLElement | null>, deps: unknown[]): Insets {
  const [insets, setInsets] = useState<Insets>({ top: 96, bottom: 170, left: 8, right: 8 });
  useLayoutEffect(() => {
    const read = () => {
      const tr = top.current?.getBoundingClientRect();
      const br = bottom.current?.getBoundingClientRect();
      const vh = window.innerHeight;
      // jsdom (no layout) reports zeros — keep the estimate.
      if (!tr || !br || (tr.height === 0 && br.height === 0)) return;
      const next = { top: tr.bottom + CHROME_GAP, bottom: Math.max(0, vh - br.top) + CHROME_GAP, left: CHROME_GAP, right: CHROME_GAP };
      setInsets((prev) =>
        Math.abs(prev.top - next.top) < 1 && Math.abs(prev.bottom - next.bottom) < 1 ? prev : next,
      );
    };
    read();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(read) : null;
    if (top.current) ro?.observe(top.current);
    if (bottom.current) ro?.observe(bottom.current);
    window.addEventListener('resize', read);
    return () => {
      ro?.disconnect();
      window.removeEventListener('resize', read);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return insets;
}

export function AcademyHub(props: AcademyHubProps) {
  const { userId, studentName, classroomId, classroomName, level, avatarConfig, profileXp, isGuest, onSignOut, classroomLoading } = props;
  const { t, language, dir } = useLanguage();
  const router = useRouter();
  const [reducedEffects] = useReducedEffects();
  const prefersReduced = useReducedMotion();
  const reducedMotion = reducedEffects || !!prefersReduced;
  const hub = useHubLayout();
  const layout = hub.art;
  const wide = hub.chrome === 'wide';
  const rail = hub.chrome === 'rail';
  const zoom: CSSProperties | undefined = hub.scale !== 1 ? { zoom: hub.scale } : undefined;
  const topRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [classOpen, setClassOpen] = useState(false);
  const [grantedXp, setGrantedXp] = useState<number | null>(null);
  const [live, setLive] = useState<LiveState>(NO_LIVE);
  const [note, setNote] = useState<Note>(null);
  const liveGame = classroomId ? live.activeGame : null;
  const socket = classroomId ? live.socket : null;
  const isLive = !!liveGame?.gameCode;

  const data = useAcademyData(level);
  const { join, isJoining, joinError } = useClassroomGameJoin({
    activeGame: liveGame,
    socket,
    userId,
    username: studentName,
  });
  const { reward, clearReward } = useClassroomRewardListener(userId);

  useEffect(() => {
    posthog.capture('student_academy_viewed', { has_class: !!classroomId });
  }, [classroomId]);

  useEffect(() => {
    if (!reward) return;
    const timer = setTimeout(() => clearReward(), 5000);
    return () => clearTimeout(timer);
  }, [reward, clearReward]);

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
  const target = [...islands, ...(boss ? [boss] : [])].find((n) => n.key === action.nodeKey);
  const spotlightTag = useCtaOverline(action.kind);
  const targetLabel = useNodeLabel(target ?? { key: 'none', kind: 'lesson', type: 'lesson', state: 'open', stars: 0, mastery: 0 });

  // Pessimistic until every source answers: a student with a class must never
  // see "Join a classroom" or a half-built map flash first (pitfall class 1).
  const ready = !classroomLoading && (!data.lessonsLoading || data.lessons.length > 0);
  const insets = useChromeInsets(topRef, bottomRef, [hub.chrome, hub.scale, hub.sideCard, ready]);

  // A late profile value must never roll the bar back below what the chest granted.
  const totalXp = Math.max(profileXp, grantedXp ?? 0);

  const openNode = useCallback(
    (node: AcademyIsland) => {
      posthog.capture('student_academy_node_clicked', { type: node.kind, state: node.state });
      if (node.kind === 'arena') {
        if (node.state === 'live') join();
        else setNote({ kind: 'arena' });
        return;
      }
      if (node.kind === 'boss' && !node.href) {
        const p = node.progress ?? { have: 0, need: 0 };
        setNote({ kind: 'boss', left: Math.max(0, p.need - p.have) });
        return;
      }
      if (node.href) router.push(node.href);
    },
    [join, router],
  );

  const pageTitle = classroomName ?? (ready ? t('academy.student.title', 'Word Academy') : null);
  const chest = (
    <DailyChest
      userId={userId}
      reducedMotion={reducedMotion}
      size={wide ? 'md' : 'sm'}
      onGranted={(xp) => xp != null && setGrantedXp(xp)}
    />
  );

  const goSolo = () => router.push(`/${language}/quick-play?academy=1`);

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
      stars={data.stars}
      isGuest={isGuest}
      onSignOut={onSignOut}
      reducedMotion={reducedMotion}
      title={pageTitle}
      size={rail ? 'compact' : wide ? 'wide' : 'normal'}
    />
  );

  return (
    <div
      dir={dir}
      data-testid="academy-hub"
      data-chrome={hub.chrome}
      data-scale={hub.scale}
      className="fixed inset-0 overflow-hidden bg-neo-navy text-neo-white"
    >
      {classroomId && <LiveGameBridge classroomId={classroomId} onChange={setLive} />}

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
          </div>
          {/* Phone: the chest is a small badge on the START side, away from the totals (end).
              Phone on its side: at the far end of the top row, clear of the map's middle. */}
          {!wide && (
            <div className={cn('pointer-events-auto flex', rail ? 'shrink-0 pt-0.5' : 'mt-3')}>
              <div className={rail ? 'me-1' : 'ms-1'}>{chest}</div>
            </div>
          )}
        </div>
        <p className="sr-only">{t('student.dashboard.greeting', { name: studentName })}</p>
      </div>

      <AnimatePresence>
        {(reward || note) && (
          <m.div
            key={reward ? 'reward' : note?.kind}
            role="status"
            aria-live="polite"
            initial={reducedMotion ? false : { y: -16, scale: 0.9 }}
            animate={{ y: 0, scale: 1 }}
            exit={{ y: -8, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 22 }}
            className={cn('absolute inset-x-3 z-30 mx-auto max-w-sm', rail ? 'top-16' : 'top-[8.5rem] sm:top-36')}
          >
            {reward ? (
              <InkPanel tone="lime" className="flex items-center justify-center gap-2 px-4 py-2 font-neo-display font-black text-neo-black">
                <Sparkles className="h-5 w-5" aria-hidden="true" />
                <span className="text-lg uppercase">{t('academy.student.rewardXp', '+{xp} XP', { xp: reward.xpEarned })}</span>
                <button onClick={clearReward} className="ms-1 text-xs underline" aria-label={t('common.dismiss', 'Dismiss')}>×</button>
              </InkPanel>
            ) : (
              <InkPanel tone="night" className="flex items-center gap-3 p-2 pe-3">
                <span className="relative h-12 w-20 shrink-0 overflow-hidden rounded-[10px] border-2 border-neo-black">
                  <Image
                    src={note?.kind === 'arena' ? '/images/education/waiting-for-teacher.webp' : '/images/education/node-boss.webp'}
                    alt=""
                    aria-hidden="true"
                    fill
                    unoptimized
                    sizes="80px"
                    className="object-cover"
                  />
                </span>
                <span dir="auto" className="font-neo-body text-sm font-bold leading-snug text-neo-white">
                  {note?.kind === 'arena'
                    ? t('academy.student.arenaWaiting', "Your teacher hasn't started a live game yet. This island lights up when they do.")
                    : t('academy.student.bossLockedNote', 'Master {count} more words to unlock the boss.', {
                        count: note?.kind === 'boss' ? note.left : 0,
                      })}
                </span>
              </InkPanel>
            )}
          </m.div>
        )}
      </AnimatePresence>

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
          <div className={cn(wide && 'w-full', wide && !hub.sideCard && 'min-w-0 max-w-[40rem] flex-1', rail && 'min-w-0 flex-1')}>
            {ready ? (
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
              onSolo={ready && action.kind !== 'solo' ? goSolo : undefined}
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
          onClose={() => setClassOpen(false)}
          reducedMotion={reducedMotion}
        />
      )}
    </div>
  );
}
