'use client';

import { m, useReducedMotion } from 'framer-motion';
import { Crown, Lock, Sparkles, Sword, Swords, Trophy, Zap } from 'lucide-react';
import { useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { ScoreCountUp } from '@/components/results/shared';
import type { WheelRushPlayerStats } from '@/shared/types/game';

interface WheelRushDominationProps {
  playerStats: Record<string, WheelRushPlayerStats>;
  currentUsername?: string;
}

interface Award {
  icon: React.ReactNode;
  titleKey: string;
  username: string;
  value: string | number;
  color: string;
  bgGlow: string;
}

const PLAYER_COLORS = [
  { fill: 'bg-neo-lime/80', text: 'text-neo-lime', border: 'border-neo-lime', glow: 'shadow-[0_0_12px_rgba(191,255,0,0.4)]' },
  { fill: 'bg-neo-pink/80', text: 'text-neo-pink', border: 'border-neo-pink', glow: 'shadow-[0_0_12px_rgba(255,20,147,0.4)]' },
  { fill: 'bg-neo-cyan/80', text: 'text-neo-cyan', border: 'border-neo-cyan', glow: 'shadow-[0_0_12px_rgba(0,255,255,0.4)]' },
  { fill: 'bg-neo-purple/80', text: 'text-neo-purple', border: 'border-neo-purple', glow: 'shadow-[0_0_12px_rgba(139,92,246,0.4)]' },
  { fill: 'bg-neo-red/80',  text: 'text-neo-red',  border: 'border-neo-red',  glow: 'shadow-[0_0_12px_rgba(255,51,102,0.4)]' },
];

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.15, delayChildren: 0.2 } },
};

const awardVariants = {
  hidden: { opacity: 0, y: 24, scale: 0.85 },
  show: {
    opacity: 1, y: 0, scale: 1,
    transition: { type: 'spring' as const, stiffness: 300, damping: 22 },
  },
};

const crownVariants = {
  hidden: { opacity: 0, scale: 0, rotate: -30 },
  show: {
    opacity: 1, scale: 1, rotate: 0,
    transition: { type: 'spring' as const, stiffness: 400, damping: 15, delay: 0.1 },
  },
};

const barVariants = {
  hidden: { scaleX: 0 },
  show: (pct: number) => ({
    scaleX: 1,
    transition: { type: 'spring' as const, stiffness: 100, damping: 20, delay: 0.3 + pct * 0.002 },
  }),
};

const reduced = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.15 } },
};

export default function WheelRushDomination({ playerStats, currentUsername }: WheelRushDominationProps) {
  const { t } = useLanguage();
  const prefersReduced = useReducedMotion();

  const entries = useMemo(() => Object.entries(playerStats), [playerStats]);

  const ranked = useMemo(() =>
    [...entries].sort(([, a], [, b]) => (b.totalScore - a.totalScore) || (b.wordsLocked - a.wordsLocked)),
    [entries],
  );

  const totalScore = useMemo(() => entries.reduce((s, [, p]) => s + p.totalScore, 0), [entries]);

  const matchRecap = useMemo(() => {
    const totalLocks = entries.reduce((s, [, p]) => s + p.wordsLocked, 0);
    const totalSteals = entries.reduce((s, [, p]) => s + p.wordsStolen, 0);
    const stealRate = totalLocks > 0 ? Math.round((totalSteals / (totalLocks + totalSteals)) * 100) : 0;
    return { totalLocks, totalSteals, stealRate };
  }, [entries]);

  const colorMap = useMemo(() => {
    const map: Record<string, typeof PLAYER_COLORS[0]> = {};
    ranked.forEach(([name], i) => { map[name] = PLAYER_COLORS[i % PLAYER_COLORS.length]; });
    return map;
  }, [ranked]);

  const awards = useMemo(() => {
    if (entries.length === 0) return [];
    const result: Award[] = [];

    // Locksmith — most words locked (primary finder)
    const topLocks = [...entries].sort(([, a], [, b]) => b.wordsLocked - a.wordsLocked)[0];
    if (topLocks && topLocks[1].wordsLocked > 0) {
      result.push({
        icon: <Lock className="w-5 h-5" />,
        titleKey: 'wheelRush.results.locksmith',
        username: topLocks[0],
        value: topLocks[1].wordsLocked,
        color: colorMap[topLocks[0]]?.text || 'text-neo-lime',
        bgGlow: 'from-neo-lime/20 to-transparent',
      });
    }

    // Bandit — most words stolen
    const topSteals = [...entries].sort(([, a], [, b]) => b.wordsStolen - a.wordsStolen)[0];
    if (topSteals && topSteals[1].wordsStolen > 0) {
      result.push({
        icon: <Swords className="w-5 h-5" />,
        titleKey: 'wheelRush.results.bandit',
        username: topSteals[0],
        value: topSteals[1].wordsStolen,
        color: colorMap[topSteals[0]]?.text || 'text-neo-red',
        bgGlow: 'from-neo-red/20 to-transparent',
      });
    }

    // Wordsmith — longest bestWord
    const topWord = [...entries].sort(([, a], [, b]) => (b.bestWord?.length || 0) - (a.bestWord?.length || 0))[0];
    if (topWord && topWord[1].bestWord) {
      result.push({
        icon: <Trophy className="w-5 h-5" />,
        titleKey: 'wheelRush.results.wordsmith',
        username: topWord[0],
        value: topWord[1].bestWord.toUpperCase(),
        color: colorMap[topWord[0]]?.text || 'text-neo-purple',
        bgGlow: 'from-neo-purple/20 to-transparent',
      });
    }

    return result;
  }, [entries, colorMap]);

  if (entries.length === 0) return null;

  const v = prefersReduced ? reduced : awardVariants;

  return (
    <m.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-3"
    >
      {/* ── Wheel Rush Match Recap hero card ── */}
      <m.div
        variants={v}
        className="relative overflow-hidden p-3 rounded-neo border-3 border-neo-black shadow-hard bg-linear-to-br from-neo-navy via-neo-navy-light to-neo-navy"
        data-testid="wheel-rush-match-recap"
      >
        <div className="relative">
          <div className="flex items-center gap-1.5 mb-2">
            <Zap className="w-4 h-4 text-neo-cyan" />
            <h3 className="text-xs font-black uppercase tracking-wider text-neo-white">
              {t('wheelRush.results.matchRecap')}
            </h3>
          </div>

          <div className="flex items-end justify-center mb-1">
            <div className="min-w-0 text-center">
              <div className="text-[10px] font-bold uppercase tracking-wider text-neo-white">
                {t('wheelRush.results.totalLocks')}
              </div>
              <div className="text-4xl font-black text-neo-cyan tabular-nums leading-none drop-shadow-[0_0_8px_rgba(0,255,255,0.3)]">
                <ScoreCountUp to={matchRecap.totalLocks} duration={1400} delay={prefersReduced ? 0 : 300} />
              </div>
            </div>
          </div>
        </div>
      </m.div>

      {/* ── Section header ── */}
      <m.div variants={v} className="flex items-center gap-2 px-1">
        <Sparkles className="w-4 h-4 text-neo-cyan" />
        <h3 className="text-sm font-black uppercase tracking-wider text-neo-white">
          {t('wheelRush.results.boardDomination')}
        </h3>
      </m.div>

      {/* ── Ranked score bars ── */}
      <m.div
        variants={v}
        className="p-3 bg-neo-navy/60 border-3 border-neo-black rounded-neo shadow-hard-sm overflow-hidden"
      >
        <div className="space-y-2">
          {ranked.map(([username, stats], idx) => {
            const pct = totalScore > 0 ? (stats.totalScore / totalScore) * 100 : 0;
            const color = colorMap[username];
            const isMe = username === currentUsername;

            return (
              <m.div key={username} variants={v} className="relative">
                <div className="flex items-center gap-2 mb-0.5">
                  {idx === 0 && (
                    <m.div variants={prefersReduced ? undefined : crownVariants}>
                      <Crown className="w-3.5 h-3.5 text-neo-yellow" />
                    </m.div>
                  )}
                  <span className={`text-xs font-bold ${isMe ? 'text-neo-white underline decoration-neo-lime/40 underline-offset-2' : 'text-neo-white'}`}>
                    {username}
                  </span>
                  <span className="text-[10px] text-neo-white ml-auto tabular-nums">
                    {stats.totalScore} {t('wheelRush.results.pts')} · {stats.wordsLocked}🔒 · {stats.wordsStolen}⚔
                  </span>
                </div>

                <div className="h-3 bg-neo-black/40 rounded-full overflow-hidden border border-neo-white/10">
                  <m.div
                    className={`h-full rounded-full ${color?.fill || 'bg-neo-cyan/80'} ${idx === 0 ? color?.glow || '' : ''}`}
                    style={{ width: `${Math.max(pct, 3)}%`, originX: 0 }}
                    variants={prefersReduced ? reduced : barVariants}
                    custom={pct}
                  />
                </div>
              </m.div>
            );
          })}
        </div>
      </m.div>

      {/* ── Awards ── */}
      {awards.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {awards.map((award, i) => (
            <m.div
              key={award.titleKey}
              variants={v}
              data-testid="wheel-rush-award"
              data-award={award.titleKey}
              className="relative p-2.5 bg-neo-navy/60 border-3 border-neo-black rounded-neo shadow-hard-sm overflow-hidden"
            >
              <div className={`absolute inset-0 bg-linear-to-br ${award.bgGlow} pointer-events-none`} />
              <div className="relative">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <span className={award.color}>{award.icon}</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neo-white">
                    {t(award.titleKey)}
                  </span>
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className={`text-lg font-black tabular-nums ${award.color}`}>
                    {typeof award.value === 'number' ? (
                      <ScoreCountUp to={award.value} duration={1000} delay={prefersReduced ? 0 : 400 + i * 150} />
                    ) : (
                      award.value
                    )}
                  </span>
                </div>
                <div className="flex items-center gap-1 mt-0.5">
                  <Sword className="w-2.5 h-2.5 text-neo-white" />
                  <span className={`text-[10px] ${award.username === currentUsername ? 'text-neo-white font-bold' : 'text-neo-white'}`}>
                    {award.username}
                  </span>
                </div>
              </div>
            </m.div>
          ))}
        </div>
      )}
    </m.div>
  );
}
