'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { Bomb, Crown, Flame, Gem, Sparkles, Sword, Trophy, Zap } from 'lucide-react';
import { useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { ScoreCountUp } from '@/components/results/shared';
import type { BlastPlayerStats } from '@/shared/types/game';

// ──────────────────────────────────────────────
// TYPES
// ──────────────────────────────────────────────

interface BlastBoardDominationProps {
  playerStats: Record<string, BlastPlayerStats>;
  currentUsername?: string;
}

interface Award {
  icon: React.ReactNode;
  titleKey: string;
  username: string;
  value: string | number;
  labelKey: string;
  color: string;
  bgGlow: string;
}

// ──────────────────────────────────────────────
// PLAYER COLORS — distinct per-player assignment
// ──────────────────────────────────────────────

const PLAYER_COLORS = [
  { fill: 'bg-neo-lime/80', text: 'text-neo-lime', border: 'border-neo-lime', glow: 'shadow-[0_0_12px_rgba(191,255,0,0.4)]' },
  { fill: 'bg-neo-pink/80', text: 'text-neo-pink', border: 'border-neo-pink', glow: 'shadow-[0_0_12px_rgba(255,20,147,0.4)]' },
  { fill: 'bg-neo-cyan/80', text: 'text-neo-cyan', border: 'border-neo-cyan', glow: 'shadow-[0_0_12px_rgba(0,255,255,0.4)]' },
  { fill: 'bg-neo-purple/80', text: 'text-neo-purple', border: 'border-neo-purple', glow: 'shadow-[0_0_12px_rgba(139,92,246,0.4)]' },
  { fill: 'bg-neo-yellow/80', text: 'text-neo-yellow', border: 'border-neo-yellow', glow: 'shadow-[0_0_12px_rgba(250,204,21,0.4)]' },
  { fill: 'bg-neo-red/80', text: 'text-neo-red', border: 'border-neo-red', glow: 'shadow-[0_0_12px_rgba(255,51,102,0.4)]' },
];

// ──────────────────────────────────────────────
// ANIMATION VARIANTS
// ──────────────────────────────────────────────

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

// ──────────────────────────────────────────────
// COMPONENT
// ──────────────────────────────────────────────

export default function BlastBoardDomination({ playerStats, currentUsername }: BlastBoardDominationProps) {
  const { t } = useLanguage();
  const prefersReduced = useReducedMotion();

  const entries = useMemo(() => Object.entries(playerStats), [playerStats]);

  // Rank players by tiles cleared (primary), then total tile bonus (tiebreaker)
  const ranked = useMemo(() =>
    [...entries].sort(([, a], [, b]) => (b.tilesCleared - a.tilesCleared) || (b.totalTileBonus - a.totalTileBonus)),
    [entries]
  );

  const totalTilesCleared = useMemo(() => entries.reduce((s, [, p]) => s + p.tilesCleared, 0), [entries]);

  // Assign colors by rank
  const colorMap = useMemo(() => {
    const map: Record<string, typeof PLAYER_COLORS[0]> = {};
    ranked.forEach(([name], i) => { map[name] = PLAYER_COLORS[i % PLAYER_COLORS.length]; });
    return map;
  }, [ranked]);

  // Build awards
  const awards = useMemo(() => {
    if (entries.length === 0) return [];
    const result: Award[] = [];

    // 1. Demolition King — most tiles cleared
    const topTiles = ranked[0];
    if (topTiles) {
      result.push({
        icon: <Bomb className="w-5 h-5" />,
        titleKey: 'blast.results.demolitionKing',
        username: topTiles[0],
        value: topTiles[1].tilesCleared,
        labelKey: 'blast.results.tilesCleared',
        color: colorMap[topTiles[0]]?.text || 'text-neo-lime',
        bgGlow: 'from-neo-lime/20 to-transparent',
      });
    }

    // 2. Combo Master — highest max combo
    const topCombo = [...entries].sort(([, a], [, b]) => b.maxCombo - a.maxCombo)[0];
    if (topCombo && topCombo[1].maxCombo > 0) {
      result.push({
        icon: <Flame className="w-5 h-5" />,
        titleKey: 'blast.results.comboMaster',
        username: topCombo[0],
        value: `${topCombo[1].maxCombo}x`,
        labelKey: 'blast.results.maxCombo',
        color: colorMap[topCombo[0]]?.text || 'text-neo-pink',
        bgGlow: 'from-neo-orange/20 to-transparent',
      });
    }

    // 3. Gem Collector — most gems
    const topGems = [...entries].sort(([, a], [, b]) => b.gemsCollected - a.gemsCollected)[0];
    if (topGems && topGems[1].gemsCollected > 0) {
      result.push({
        icon: <Gem className="w-5 h-5" />,
        titleKey: 'blast.results.gemCollector',
        username: topGems[0],
        value: topGems[1].gemsCollected,
        labelKey: 'blast.results.gemsCollected',
        color: colorMap[topGems[0]]?.text || 'text-neo-cyan',
        bgGlow: 'from-neo-cyan/20 to-transparent',
      });
    }

    // 4. Wordsmith — longest best word
    const topWord = [...entries].sort(([, a], [, b]) => (b.bestWord?.length || 0) - (a.bestWord?.length || 0))[0];
    if (topWord && topWord[1].bestWord) {
      result.push({
        icon: <Trophy className="w-5 h-5" />,
        titleKey: 'blast.results.wordsmith',
        username: topWord[0],
        value: topWord[1].bestWord.toUpperCase(),
        labelKey: 'blast.results.bestWord',
        color: colorMap[topWord[0]]?.text || 'text-neo-purple',
        bgGlow: 'from-neo-purple/20 to-transparent',
      });
    }

    return result;
  }, [entries, ranked, colorMap]);

  if (entries.length === 0) return null;

  const v = prefersReduced ? reduced : awardVariants;

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-3"
    >
      {/* ── Section header ── */}
      <motion.div variants={v} className="flex items-center gap-2 px-1">
        <Sparkles className="w-4 h-4 text-neo-orange" />
        <h3 className="text-sm font-black uppercase tracking-wider text-neo-cream/80">
          {t('blast.results.boardDomination')}
        </h3>
      </motion.div>

      {/* ── Domination bars — who cleared the most ── */}
      <motion.div
        variants={v}
        className="p-3 bg-neo-navy/60 border-3 border-neo-black rounded-neo shadow-hard-sm overflow-hidden"
      >
        <div className="space-y-2">
          {ranked.map(([username, stats], idx) => {
            const pct = totalTilesCleared > 0 ? (stats.tilesCleared / totalTilesCleared) * 100 : 0;
            const color = colorMap[username];
            const isMe = username === currentUsername;

            return (
              <motion.div
                key={username}
                variants={v}
                className="relative"
              >
                {/* Player row */}
                <div className="flex items-center gap-2 mb-0.5">
                  {idx === 0 && (
                    <motion.div variants={prefersReduced ? undefined : crownVariants}>
                      <Crown className="w-3.5 h-3.5 text-neo-yellow" />
                    </motion.div>
                  )}
                  <span className={`text-xs font-bold ${isMe ? 'text-neo-white' : 'text-neo-cream/80'} ${isMe ? 'underline decoration-neo-lime/40 underline-offset-2' : ''}`}>
                    {username}
                  </span>
                  <span className="text-[10px] text-neo-cream/50 ml-auto tabular-nums">
                    {stats.tilesCleared} {t('blast.results.tiles')} · {Math.round(pct)}%
                  </span>
                </div>

                {/* Bar */}
                <div className="h-3 bg-neo-black/40 rounded-full overflow-hidden border border-neo-white/10">
                  <motion.div
                    className={`h-full rounded-full ${color?.fill || 'bg-neo-lime/80'} ${idx === 0 ? color?.glow || '' : ''}`}
                    style={{ width: `${Math.max(pct, 3)}%`, originX: 0 }}
                    variants={prefersReduced ? reduced : barVariants}
                    custom={pct}
                  />
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* ── Awards — fun "who did what best" callouts ── */}
      {awards.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {awards.map((award, i) => (
            <motion.div
              key={award.titleKey}
              variants={v}
              className="relative p-2.5 bg-neo-navy/60 border-3 border-neo-black rounded-neo shadow-hard-sm overflow-hidden"
            >
              {/* Ambient glow */}
              <div className={`absolute inset-0 bg-linear-to-br ${award.bgGlow} pointer-events-none`} />

              {/* Content */}
              <div className="relative">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <span className={award.color}>{award.icon}</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neo-cream/60">
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
                  <Sword className="w-2.5 h-2.5 text-neo-cream/40" />
                  <span className={`text-[10px] ${award.username === currentUsername ? 'text-neo-white font-bold' : 'text-neo-cream/60'}`}>
                    {award.username}
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* ── Per-player stat rows (compact) ── */}
      {ranked.length > 1 && (
        <motion.div variants={v} className="space-y-1.5">
          <h4 className="text-[10px] font-bold uppercase tracking-wider text-neo-cream/50 px-1">
            {t('blast.multiplayer.playerStats')}
          </h4>
          {ranked.map(([username, stats]) => {
            const color = colorMap[username];
            const isMe = username === currentUsername;
            return (
              <motion.div
                key={username}
                variants={v}
                className={`flex items-center gap-3 px-3 py-2 bg-neo-navy/40 rounded-neo border-2 ${isMe ? (color?.border || 'border-neo-lime') + ' border-opacity-60' : 'border-neo-black/60'}`}
              >
                {/* Color dot + name */}
                <div className="flex items-center gap-1.5 min-w-0 shrink-0">
                  <div className={`w-2 h-2 rounded-full ${color?.fill || 'bg-neo-lime'}`} />
                  <span className={`text-xs font-bold truncate ${isMe ? 'text-neo-white' : 'text-neo-cream/80'}`}>
                    {username}
                  </span>
                </div>

                {/* Stats chips */}
                <div className="flex items-center gap-3 ml-auto text-[10px] text-neo-cream/60 tabular-nums">
                  <span className="flex items-center gap-0.5" title={t('blast.results.tilesCleared')}>
                    <Zap className="w-3 h-3 text-neo-yellow" />{stats.tilesCleared}
                  </span>
                  <span className="flex items-center gap-0.5" title={t('blast.results.maxCombo')}>
                    <Flame className="w-3 h-3 text-neo-orange" />{stats.maxCombo}x
                  </span>
                  <span className="flex items-center gap-0.5" title={t('blast.results.gemsCollected')}>
                    <Gem className="w-3 h-3 text-neo-cyan" />{stats.gemsCollected}
                  </span>
                  <span className="flex items-center gap-0.5 font-bold text-neo-cream/70" title={t('blast.results.bestWord')}>
                    {stats.bestWord?.toUpperCase() || '—'}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </motion.div>
  );
}
