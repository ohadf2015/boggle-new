'use client';

// Wheel-themed hero card for wheel-rush results. Replaces the linear
// `WheelRushDomination` summary with a radial composition that recalls the
// in-game wheel: spinning Pixi backdrop, winner anchored at center, runners-up
// orbiting at angles, awards arcing along the bottom. Entrance is a GSAP
// timeline so motion settles in coordinated beats instead of all-at-once.

import { useEffect, useMemo, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useReducedMotion } from 'framer-motion';
import { gsap } from 'gsap';
import { Crown, Lock, Sparkles, Swords, Trophy } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { ScoreCountUp } from '@/components/results/shared';
import Avatar from '@/components/Avatar';
import type { Avatar as AvatarType, WheelRushPlayerStats } from '@/shared/types/game';

const WheelRushSpinCanvas = dynamic(() => import('./WheelRushSpinCanvas'), { ssr: false });

interface PlayerScoreLike {
  username: string;
  avatar?: AvatarType;
}

interface Props {
  playerStats: Record<string, WheelRushPlayerStats>;
  // Used to look up avatar for each player by username (optional — avatars
  // gracefully fall back to deterministic generation via userId=username).
  scores?: PlayerScoreLike[];
  currentUsername?: string;
}

const RANK_GLOW = [
  'shadow-[0_0_24px_rgba(255,225,53,0.55)]',
  'shadow-[0_0_18px_rgba(0,255,255,0.4)]',
  'shadow-[0_0_14px_rgba(255,20,147,0.35)]',
  'shadow-[0_0_10px_rgba(139,92,246,0.3)]',
  'shadow-[0_0_8px_rgba(255,51,102,0.3)]',
];

// Placement badge fill, color-matched to RANK_GLOW so badge hue == avatar glow.
// Gives every player (winner included) one numbered, color-coded rank marker —
// the orbit positions alone don't read as an ordered 1·2·3·4.
const RANK_BADGE = [
  'bg-neo-yellow text-neo-black',
  'bg-neo-cyan text-neo-black',
  'bg-neo-pink text-neo-white',
  'bg-neo-purple text-neo-white',
  'bg-neo-red text-neo-white',
];

export default function WheelRushResultsScene({ playerStats, scores, currentUsername }: Props) {
  const { t } = useLanguage();
  const prefersReduced = useReducedMotion();
  const sceneRef = useRef<HTMLDivElement>(null);

  const ranked = useMemo(() => {
    return Object.entries(playerStats)
      .sort(([, a], [, b]) => (b.totalScore - a.totalScore) || (b.wordsLocked - a.wordsLocked));
  }, [playerStats]);

  const avatarByUsername = useMemo(() => {
    const m: Record<string, AvatarType | undefined> = {};
    (scores ?? []).forEach(s => { m[s.username] = s.avatar; });
    return m;
  }, [scores]);

  const recap = useMemo(() => {
    const entries = Object.values(playerStats);
    const totalLocks = entries.reduce((s, p) => s + p.wordsLocked, 0);
    const totalSteals = entries.reduce((s, p) => s + p.wordsStolen, 0);
    const stealRate = totalLocks + totalSteals > 0
      ? Math.round((totalSteals / (totalLocks + totalSteals)) * 100)
      : 0;
    return { totalLocks, totalSteals, stealRate };
  }, [playerStats]);

  const awards = useMemo(() => {
    const list = Object.entries(playerStats);
    const out: Array<{ key: string; icon: React.ReactNode; titleKey: string; username: string; value: string | number; tone: string }> = [];
    if (list.length === 0) return out;

    const topLocks = [...list].sort(([, a], [, b]) => b.wordsLocked - a.wordsLocked)[0];
    if (topLocks?.[1].wordsLocked > 0) {
      out.push({
        key: 'locksmith',
        icon: <Lock className="w-4 h-4" />,
        titleKey: 'wheelRush.results.locksmith',
        username: topLocks[0],
        value: topLocks[1].wordsLocked,
        tone: 'text-neo-lime',
      });
    }
    const topSteals = [...list].sort(([, a], [, b]) => b.wordsStolen - a.wordsStolen)[0];
    if (topSteals?.[1].wordsStolen > 0) {
      out.push({
        key: 'bandit',
        icon: <Swords className="w-4 h-4" />,
        titleKey: 'wheelRush.results.bandit',
        username: topSteals[0],
        value: topSteals[1].wordsStolen,
        tone: 'text-neo-red',
      });
    }
    const topWord = [...list].sort(([, a], [, b]) => (b.bestWord?.length || 0) - (a.bestWord?.length || 0))[0];
    if (topWord?.[1].bestWord) {
      out.push({
        key: 'wordsmith',
        icon: <Trophy className="w-4 h-4" />,
        titleKey: 'wheelRush.results.wordsmith',
        username: topWord[0],
        value: topWord[1].bestWord.toUpperCase(),
        tone: 'text-neo-purple',
      });
    }
    return out;
  }, [playerStats]);

  // GSAP entrance — orchestrated beats: spin settles → center pops → orbit
  // avatars stagger in along radial paths → stats lift up → awards.
  useEffect(() => {
    if (prefersReduced || !sceneRef.current) return;
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
      tl.from('[data-scene-center]', {
        scale: 0, duration: 0.55, delay: 0.6, ease: 'back.out(1.7)',
      });
      tl.from('[data-scene-orbit]', {
        scale: 0, duration: 0.5,
        stagger: { each: 0.1, from: 'random' },
        ease: 'back.out(1.5)',
      }, '-=0.2');
      tl.from('[data-scene-stat]', {
        y: 18, duration: 0.4, stagger: 0.08,
      }, '-=0.15');
      const awardEls = sceneRef.current?.querySelectorAll('[data-scene-award]');
      if (awardEls && awardEls.length > 0) {
        tl.from(awardEls, {
          y: 14, duration: 0.35, stagger: 0.08,
        }, '-=0.1');
      }
    }, sceneRef);
    return () => ctx.revert();
  }, [prefersReduced]);

  if (ranked.length === 0) return null;

  const winner = ranked[0];
  const orbiters = ranked.slice(1);
  const orbitRadiusPct = 38; // % of container (avatar offset from center)

  return (
    <div
      ref={sceneRef}
      className="relative overflow-hidden rounded-neo border-3 border-neo-black shadow-hard bg-linear-to-br from-neo-navy via-neo-navy-light to-neo-navy"
      data-testid="wheel-rush-results-scene"
    >
      {/* Banner header */}
      <div className="relative z-10 flex items-center justify-center gap-1.5 pt-3 pb-1">
        <Sparkles className="w-3.5 h-3.5 text-neo-cyan" />
        <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-neo-white">
          {t('wheelRush.results.sceneTitle')}
        </h3>
        <Sparkles className="w-3.5 h-3.5 text-neo-cyan" />
      </div>

      {/* Wheel composition */}
      <div className="relative aspect-square w-full max-w-[420px] mx-auto">
        <WheelRushSpinCanvas reducedMotion={!!prefersReduced} />

        {/* Center: winner */}
        <div
          data-scene-center
          className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
        >
          <div className={`relative ${RANK_GLOW[0]} rounded-full`}>
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
              <Crown className="w-5 h-5 text-neo-yellow drop-shadow-[0_0_6px_rgba(255,225,53,0.7)]" />
            </div>
            <Avatar
              customAvatar={avatarByUsername[winner[0]]?.customAvatar ?? null}
              userId={winner[0]}
              size="xl"
              mode="multiplayer"
            />
            <span
              data-testid="wheel-rush-winner-rank"
              className={`absolute -bottom-1 -right-1 w-7 h-7 rounded-full border-2 border-neo-black text-xs font-black flex items-center justify-center shadow-hard-sm z-10 ${RANK_BADGE[0]}`}
            >
              1
            </span>
          </div>
          <div className="mt-1.5 text-center">
            <div className={`text-sm font-black truncate max-w-[140px] ${winner[0] === currentUsername ? 'text-neo-white underline decoration-neo-lime/50 underline-offset-2' : 'text-neo-white'}`}>
              {winner[0]}
            </div>
            <div className="text-2xl font-black text-neo-cyan tabular-nums leading-none drop-shadow-[0_0_8px_rgba(0,255,255,0.4)]">
              <ScoreCountUp to={winner[1].totalScore} duration={1400} delay={prefersReduced ? 0 : 700} />
            </div>
            <div className="flex items-center justify-center gap-1 text-[10px] uppercase tracking-wider text-neo-white mt-0.5">
              <Lock className="w-3 h-3 text-neo-lime" />
              <span className="tabular-nums">{winner[1].wordsLocked}</span>
            </div>
          </div>
        </div>

        {/* Orbiting runners-up */}
        {orbiters.map(([uname, stats], i) => {
          // Distribute on lower hemisphere arc — feels like a podium gathering
          // around the throne instead of forming an even circle.
          const total = orbiters.length;
          const arcStart = total === 1 ? Math.PI / 2 : Math.PI * 0.15;
          const arcSpan = total === 1 ? 0 : Math.PI * 0.7;
          const t = total === 1 ? 0.5 : i / (total - 1);
          const angle = arcStart + arcSpan * t + Math.PI; // shift to bottom hemi
          const x = 50 + orbitRadiusPct * Math.cos(angle);
          const y = 50 + orbitRadiusPct * Math.sin(angle);
          const isMe = uname === currentUsername;
          const glow = RANK_GLOW[Math.min(i + 1, RANK_GLOW.length - 1)];
          return (
            <div
              key={uname}
              data-scene-orbit
              className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center"
              style={{ left: `${x}%`, top: `${y}%` }}
            >
              <div className={`relative rounded-full ${glow}`}>
                <Avatar
                  customAvatar={avatarByUsername[uname]?.customAvatar ?? null}
                  userId={uname}
                  size="lg"
                  mode={i === 0 ? 'multiplayer' : undefined}
                />
                <span className={`absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full border-2 border-neo-black text-[11px] font-black flex items-center justify-center shadow-hard-sm ${RANK_BADGE[Math.min(i + 1, RANK_BADGE.length - 1)]}`}>
                  {i + 2}
                </span>
              </div>
              <div className="mt-0.5 text-center">
                <div className={`text-[10px] font-bold truncate max-w-[80px] ${isMe ? 'text-neo-white underline decoration-neo-lime/50 underline-offset-2' : 'text-neo-white'}`}>
                  {uname}
                </div>
                <div className="text-[11px] font-black tabular-nums text-neo-white">
                  {stats.totalScore}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Stats row */}
      <div className="relative z-10 flex justify-center px-3 pb-3 pt-1">
        <StatTile
          icon={<Lock className="w-3 h-3" />}
          label={t('wheelRush.results.totalLocks')}
          value={recap.totalLocks}
          tone="text-neo-lime"
          countUp
          delay={prefersReduced ? 0 : 1100}
        />
      </div>

      {/* Awards */}
      {awards.length > 0 && (
        <div className="relative z-10 grid grid-cols-3 gap-2 px-3 pb-3 border-t-2 border-neo-black/40 pt-3">
          {awards.map((award) => (
            <div
              key={award.key}
              data-scene-award
              data-testid="wheel-rush-scene-award"
              data-award={award.key}
              className="relative p-2 bg-neo-navy/80 border-2 border-neo-black rounded-neo shadow-hard-sm overflow-hidden"
            >
              <div className="flex items-center gap-1 mb-0.5">
                <span className={award.tone}>{award.icon}</span>
                <span className="text-[9px] font-bold uppercase tracking-wider text-neo-white truncate">
                  {t(award.titleKey)}
                </span>
              </div>
              <div className={`text-base font-black tabular-nums ${award.tone}`}>
                {typeof award.value === 'number' ? (
                  <ScoreCountUp to={award.value} duration={900} delay={prefersReduced ? 0 : 1500} />
                ) : (
                  <span className="truncate block">{award.value}</span>
                )}
              </div>
              <div className="text-[9px] text-neo-white truncate">
                {award.username}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface StatTileProps {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  tone: string;
  countUp?: boolean;
  delay?: number;
}

function StatTile({ icon, label, value, tone, countUp, delay = 0 }: StatTileProps) {
  return (
    <div
      data-scene-stat
      data-testid="wheel-rush-scene-stat"
      className="flex flex-col items-center gap-0.5 p-2 bg-neo-navy/60 border-2 border-neo-black rounded-neo shadow-hard-sm"
    >
      <div className={`flex items-center gap-1 ${tone}`}>
        {icon}
        <span className="text-base font-black tabular-nums">
          {countUp && typeof value === 'number' ? (
            <ScoreCountUp to={value} duration={900} delay={delay} />
          ) : (
            value
          )}
        </span>
      </div>
      <span className="text-[9px] uppercase tracking-wider text-neo-white text-center leading-tight">
        {label}
      </span>
    </div>
  );
}
