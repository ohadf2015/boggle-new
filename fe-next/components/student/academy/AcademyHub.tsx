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

import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { AcademyMap, useMapLayout } from './AcademyMap';
import { AcademyCta } from './AcademyCta';
import { AcademyDock } from './AcademyDock';
import { DailyChest } from './DailyChest';
import { ClassSheet } from './ClassSheet';
import { InkPanel, Ribbon, INK_TEXT } from './chrome';
import { useNodeLabel } from './AcademyNodeButton';

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

export function AcademyHub(props: AcademyHubProps) {
  const { userId, studentName, classroomId, classroomName, level, avatarConfig, profileXp, isGuest, onSignOut, classroomLoading } = props;
  const { t, language, dir } = useLanguage();
  const router = useRouter();
  const [reducedEffects] = useReducedEffects();
  const prefersReduced = useReducedMotion();
  const reducedMotion = reducedEffects || !!prefersReduced;
  const layout = useMapLayout();
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
  const targetLabel = useNodeLabel(target ?? { key: 'none', kind: 'lesson', type: 'lesson', state: 'open', stars: 0, mastery: 0 });

  // Pessimistic until every source answers: a student with a class must never
  // see "Join a classroom" or a half-built map flash first (pitfall class 1).
  const ready = !classroomLoading && (!data.lessonsLoading || data.lessons.length > 0);

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

  const goSolo = () => router.push(`/${language}/quick-play`);

  const pressCta = () => {
    posthog.capture('student_academy_cta_clicked', { kind: action.kind });
    if (action.kind === 'live') join();
    else if (action.kind === 'join-class') router.push(`/${language}/student/join`);
    else if (action.kind === 'solo') goSolo();
    else if (target?.href) router.push(target.href);
  };

  return (
    <div
      dir={dir}
      data-testid="academy-hub"
      className="fixed inset-0 overflow-hidden bg-neo-navy text-neo-white"
    >
      {classroomId && <LiveGameBridge classroomId={classroomId} onChange={setLive} />}

      <main className="absolute inset-0" aria-label={t('academy.student.mapLabel', 'Academy map')}>
        <AcademyMap
          layout={layout}
          islands={ready ? islands : []}
          boss={ready ? boss : null}
          recommendedKey={ready ? action.nodeKey : null}
          onOpen={openNode}
          reducedMotion={reducedMotion}
        />
      </main>

      {/* Top: HUD plaque, then the class pennant and the daily chest. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 px-3 pt-[calc(env(safe-area-inset-top,0px)+0.5rem)] sm:px-6 sm:pt-4">
        <div className="pointer-events-auto">
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
          />
        </div>
        <div className="mx-auto mt-2 flex w-full max-w-3xl items-start justify-between gap-2 lg:max-w-none">
          <Ribbon tone="pink" className="pointer-events-auto min-w-0 max-w-[70%]">
            <h1 dir="auto" className={`truncate font-neo-display text-sm font-black uppercase tracking-wide text-neo-white sm:text-lg ${INK_TEXT}`}>
              {classroomName ?? (ready ? t('academy.student.title', 'Word Academy') : '\u00a0')}
            </h1>
          </Ribbon>
          <p className="sr-only">{t('student.dashboard.greeting', { name: studentName })}</p>
          <div className="pointer-events-auto shrink-0">
            <DailyChest userId={userId} reducedMotion={reducedMotion} onGranted={(xp) => xp != null && setGrantedXp(xp)} />
          </div>
        </div>
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
            className="absolute inset-x-3 top-[9.5rem] z-30 mx-auto max-w-sm sm:top-40"
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

      {/* Bottom: the ONE hero action, then the dock. */}
      <div className="absolute inset-x-0 bottom-0 z-20 px-3 pb-[calc(env(safe-area-inset-bottom,0px)+0.75rem)] sm:px-6 sm:pb-5">
        <div className="mx-auto flex w-full max-w-xl flex-col gap-2.5 lg:max-w-5xl lg:flex-row lg:items-end lg:gap-4">
          <div className="lg:flex-[3]">
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
              />
            ) : (
              <div
                data-testid="academy-cta-pending"
                aria-busy="true"
                className="h-[68px] w-full animate-pulse rounded-[20px] border-3 border-neo-cream bg-neo-navy-light sm:h-[76px]"
              />
            )}
          </div>
          <div className="lg:flex-[2]">
            <AcademyDock
              locale={language}
              reviewCount={data.reviewCount}
              onOpenClass={classroomId ? () => setClassOpen(true) : undefined}
              onSolo={ready && action.kind !== 'solo' ? goSolo : undefined}
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
