'use client';

import { useEffect, useMemo, useRef } from 'react';
import { m } from 'framer-motion';
import NumberFlow from '@number-flow/react';
import { useReward } from 'react-rewards';
import {
  Star,
  Zap,
  RotateCcw,
  ArrowLeft,
  ChevronRight,
  Trophy,
  TrendingUp,
  BookOpen,
  Target,
  Sparkles,
  Waves,
  Flag,
  Link as LinkIcon,
  Crown,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { BlastResultsData } from '@/components/blast/legacy/types';
import { useBlastBadgeUnlocks } from '@/components/blast/legacy/hooks/useBlastBadgeUnlocks';
import { trackBlastResultsViewed } from '@/components/blast/legacy/utils/blastTelemetry';

// Lucide icon resolver for badge icon names stored as strings in blastBadges.ts.
// Keeps the badge registry free of React imports (serializable, SSR-safe).
const BADGE_ICON_MAP: Record<string, LucideIcon> = {
  Sparkles,
  Waves,
  Flag,
  Link: LinkIcon,
  Crown,
  BookOpen,
  Target,
  Trophy,
};

// Framer-motion stagger variants shared by the results screen sections.
const containerVariants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.12, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring' as const, stiffness: 200, damping: 20 },
  },
};

// ─── BlastReadyScreen ──────────────────────────────────────────────────

interface BlastReadyScreenProps {
  onStart: () => void;
  onBack: () => void;
  t: (path: string, fallbackOrParams?: string | Record<string, string | number>, paramsWhenFallback?: Record<string, string | number>) => string;
}

export function BlastReadyScreen({ onStart, onBack, t }: BlastReadyScreenProps) {
  return (
    <div
      className="flex flex-col items-center justify-center min-h-screen p-4 gap-6"
      style={{ background: 'radial-gradient(ellipse at 50% 30%, #2d1b4e 0%, #0f0c29 70%, #080618 100%)' }}
    >
      <m.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200 }}
      >
        <div className="text-center">
          <h1
            className="text-5xl font-neo-display font-black mb-3"
            style={{
              background: 'linear-gradient(180deg, #FFE566 0%, #FFD700 50%, #B8860B 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              filter: 'drop-shadow(0 3px 6px rgba(0,0,0,0.5))',
            }}
          >
            <Zap className="inline w-10 h-10 me-2 text-neo-cyan" style={{ WebkitTextFillColor: 'initial' }} />
            {t('blast.ready.title')}
          </h1>
          <p className="text-white/50 font-neo-body text-lg">
            {t('blast.ready.subtitle')}
          </p>
        </div>
      </m.div>

      <div
        className="rounded-2xl p-5 max-w-xs text-sm text-white/70 space-y-2.5 font-neo-body"
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          backdropFilter: 'blur(10px)',
        }}
      >
        <p className="font-bold text-neo-cyan text-base">{t('blast.help')}</p>
        <p>↔ {t('blast.ready.rule1')}</p>
        <p>→↓ {t('blast.ready.rule2')}</p>
        <p>💣⚡🔷 {t('blast.ready.rule3')}</p>
        <p>📐 {t('blast.ready.rule4')}</p>
      </div>

      <Button
        onClick={onStart}
        className="border-3 border-neo-black font-neo-display text-xl px-10 py-5 rounded-xl"
        style={{
          background: 'linear-gradient(180deg, #66FFFF 0%, #00FFFF 50%, #00B3B3 100%)',
          boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.4), 0 4px 0 #008888, 0 6px 16px rgba(0,255,255,0.3)',
          color: '#1a1a2e',
        }}
      >
        {t('blast.ready.play')}
      </Button>

      <Button
        onClick={onBack}
        variant="outline"
        className="border-3 border-neo-lime text-neo-lime bg-neo-navy/80 hover:bg-neo-navy"
      >
        <ArrowLeft className="w-4 h-4 me-1" />
        {t('common.back')}
      </Button>
    </div>
  );
}

// ─── BlastWaveTransitionScreen ─────────────────────────────────────────

interface BlastWaveTransitionScreenProps {
  currentWave: number;
  lastWaveStats: { score: number; words: number; clearPct: number };
  stars: number;
  onNextWave: () => void;
  t: (path: string, fallbackOrParams?: string | Record<string, string | number>, paramsWhenFallback?: Record<string, string | number>) => string;
}

export function BlastWaveTransitionScreen({
  currentWave,
  lastWaveStats,
  stars,
  onNextWave,
  t,
}: BlastWaveTransitionScreenProps) {
  return (
    <div
      className="flex flex-col items-center justify-center min-h-screen p-4 gap-6"
      style={{ background: 'radial-gradient(ellipse at 50% 30%, #2d1b4e 0%, #0f0c29 70%, #080618 100%)' }}
    >
      <m.div
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 150 }}
      >
        <div
          className="text-center p-8 rounded-2xl max-w-sm"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,215,0,0.15)',
            backdropFilter: 'blur(12px)',
            boxShadow: '0 12px 40px rgba(0,0,0,0.4)',
          }}
        >
          <h2
            className="text-2xl font-neo-display font-black mb-5"
            style={{
              background: 'linear-gradient(180deg, #FFE566, #FFD700, #B8860B)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            {t('blast.waveComplete', { wave: currentWave })}
          </h2>
          <div className="flex gap-6 text-white mb-5" dir="ltr">
            <div className="text-center">
              <div className="text-3xl font-black tabular-nums">{lastWaveStats.score}</div>
              <div className="text-xs text-white/40">{t('blast.score')}</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-black tabular-nums">{lastWaveStats.words}</div>
              <div className="text-xs text-white/40">{t('blast.words')}</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-black tabular-nums">{Math.round(lastWaveStats.clearPct)}%</div>
              <div className="text-xs text-white/40">{t('blast.cleared')}</div>
            </div>
          </div>
          <div className="flex gap-1.5 justify-center mb-4" dir="ltr">
            {[1, 2, 3].map((s) => (
              <Star
                key={s}
                className={`w-9 h-9 ${
                  s <= stars ? 'text-amber-400 fill-amber-400' : 'text-white/10'
                }`}
                style={s <= stars ? { filter: 'drop-shadow(0 0 4px rgba(255,215,0,0.5))' } : undefined}
              />
            ))}
          </div>
        </div>
      </m.div>

      <Button
        onClick={onNextWave}
        className="border-3 border-neo-black font-neo-display text-lg px-8 py-4 rounded-xl"
        style={{
          background: 'linear-gradient(180deg, #66FFFF 0%, #00FFFF 50%, #00B3B3 100%)',
          boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.4), 0 4px 0 #008888, 0 6px 16px rgba(0,255,255,0.3)',
          color: '#1a1a2e',
        }}
      >
        {t('blast.nextWave', { wave: currentWave + 1 })}
        <ChevronRight className="w-5 h-5 ms-1" />
      </Button>
    </div>
  );
}

// ─── BlastResultsScreen ────────────────────────────────────────────────

interface BlastResultsScreenProps {
  results: BlastResultsData | null;
  onPlayAgain: () => void;
  onBack: () => void;
  t: (path: string, fallbackOrParams?: string | Record<string, string | number>, paramsWhenFallback?: Record<string, string | number>) => string;
}

export function BlastResultsScreen({ results, onPlayAgain, onBack, t }: BlastResultsScreenProps) {
  const finalScore = results?.finalScore ?? 0;
  const wavesCompleted = results?.wavesCompleted ?? 0;
  const wordsCount = results?.wordsFound.length ?? 0;
  const stars = results?.stars ?? 0;
  const bestWord = results?.bestWord ?? '';
  const maxCombo = results?.maxCombo ?? 0;
  const previousBest = results?.previousBest;
  const percentile = results?.percentile;

  // Compute earned badges, persist new unlocks, fire sonner toasts + haptics.
  // Returns enriched list with localized labels + isNew flags for rendering.
  const badges = useBlastBadgeUnlocks({ results, t });

  // New record if we beat a previous best
  const isNewRecord = previousBest != null && finalScore > previousBest;
  const pbDelta = isNewRecord ? finalScore - (previousBest ?? 0) : 0;

  // Derive best wave from waveResults (pure client-side)
  const bestWave = useMemo(() => {
    if (results?.bestWave) return results.bestWave;
    if (!results?.waveResults?.length) return null;
    return results.waveResults.reduce((best, w) =>
      w.score > best.score ? w : best,
    );
  }, [results]);

  // Confetti reward anchor for new records
  const { reward } = useReward('blast-results-reward', 'confetti', {
    elementCount: 120,
    spread: 90,
    lifetime: 200,
  });
  const firedRef = useRef(false);
  useEffect(() => {
    if (isNewRecord && !firedRef.current) {
      firedRef.current = true;
      // Small delay so the reward fires after the score card has appeared
      const id = window.setTimeout(() => reward(), 300);
      return () => window.clearTimeout(id);
    }
    return undefined;
  }, [isNewRecord, reward]);

  // Fire blast_results_viewed exactly once per results-screen mount.
  const viewedFiredRef = useRef(false);
  useEffect(() => {
    if (!results || viewedFiredRef.current) return;
    viewedFiredRef.current = true;
    trackBlastResultsViewed({
      finalScore: results.finalScore,
      wavesCompleted: results.wavesCompleted,
      badgeCount: badges.length,
    });
  }, [results, badges.length]);

  // Top-N% label: percentile is "higher = better", so top% = 100 - percentile
  const topPercent = percentile != null ? Math.max(1, 100 - percentile) : null;

  return (
    <div
      className="flex flex-col items-center justify-start min-h-screen p-4 py-8 gap-5"
      style={{ background: 'radial-gradient(ellipse at 50% 30%, #2d1b4e 0%, #0f0c29 70%, #080618 100%)' }}
    >
      <m.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="w-full max-w-sm flex flex-col gap-4"
      >
        {/* ─── 1. Final Score + Stars + PB delta ─── */}
        <m.div
          variants={itemVariants}
          className="text-center p-6 rounded-2xl relative"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,215,0,0.15)',
            backdropFilter: 'blur(12px)',
            boxShadow: '0 12px 40px rgba(0,0,0,0.4)',
          }}
        >
          <span
            id="blast-results-reward"
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
          />
          <h2 className="text-xl font-neo-display font-black text-white/80 mb-1 flex items-center justify-center gap-2">
            {isNewRecord ? (
              <>
                <Sparkles className="w-5 h-5 text-amber-300" />
                {t('blast.results.newRecord')}
              </>
            ) : (
              t('blast.gameOver')
            )}
          </h2>
          <div
            className="text-6xl font-black mb-3 tabular-nums"
            style={{
              background: 'linear-gradient(180deg, #FFE566, #FFD700, #B8860B)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.4))',
            }}
          >
            <NumberFlow value={finalScore} />
          </div>

          {/* Stars */}
          <div className="flex gap-1.5 justify-center mb-3" dir="ltr">
            {[1, 2, 3].map((s) => (
              <Star
                key={s}
                className={`w-8 h-8 ${
                  s <= stars ? 'text-amber-400 fill-amber-400' : 'text-white/10'
                }`}
                style={s <= stars ? { filter: 'drop-shadow(0 0 4px rgba(255,215,0,0.5))' } : undefined}
              />
            ))}
          </div>

          {/* PB delta */}
          {previousBest != null && (
            <div className="text-xs text-white/60 font-neo-body">
              {isNewRecord
                ? t('blast.results.pbDelta', { delta: pbDelta })
                : t('blast.results.fromBest', { best: previousBest })}
            </div>
          )}
        </m.div>

        {/* ─── 2. Rank card (gated on percentile) ─── */}
        {topPercent != null && (
          <m.div
            variants={itemVariants}
            className="p-4 rounded-2xl"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(0,255,255,0.15)',
              backdropFilter: 'blur(12px)',
            }}
          >
            <div className="flex items-center gap-3 mb-2">
              <Trophy className="w-5 h-5 text-neo-cyan" />
              <span className="text-sm font-neo-display font-bold text-white/80">
                {t('blast.results.yourRank')}
              </span>
            </div>
            <div className="text-lg font-neo-display font-black text-neo-cyan mb-2 tabular-nums">
              {t('blast.results.topPercent', { pct: topPercent })}
            </div>
            <div
              className="relative h-2 rounded-full overflow-hidden"
              style={{ background: 'rgba(255,255,255,0.08)' }}
            >
              <m.div
                className="absolute left-0 top-0 h-full rounded-full"
                style={{
                  background: 'linear-gradient(90deg, #00FFFF, #66FFFF)',
                  boxShadow: '0 0 8px rgba(0,255,255,0.5)',
                }}
                initial={{ width: 0 }}
                animate={{ width: `${percentile ?? 0}%` }}
                transition={{ duration: 0.8, delay: 0.4, ease: 'easeOut' }}
              />
            </div>
          </m.div>
        )}

        {/* ─── 3. Best Moments grid ─── */}
        <m.div variants={itemVariants} className="grid grid-cols-3 gap-2">
          <StatTile
            icon={<BookOpen className="w-4 h-4 text-neo-lime" />}
            label={t('blast.results.bestWord')}
            value={bestWord || '—'}
          />
          <StatTile
            icon={<Zap className="w-4 h-4 text-amber-300" />}
            label={t('blast.results.biggestCombo')}
            value={String(maxCombo)}
          />
          <StatTile
            icon={<Target className="w-4 h-4 text-neo-pink" />}
            label={t('blast.results.bestWave')}
            value={bestWave ? `W${bestWave.waveNumber}` : '—'}
          />
        </m.div>

        {/* ─── 4. Totals grid ─── */}
        <m.div variants={itemVariants} className="grid grid-cols-2 gap-2">
          <StatTile
            icon={<TrendingUp className="w-4 h-4 text-neo-cyan" />}
            label={t('blast.waves')}
            value={<NumberFlow value={wavesCompleted} />}
          />
          <StatTile
            icon={<BookOpen className="w-4 h-4 text-neo-lime" />}
            label={t('blast.words')}
            value={<NumberFlow value={wordsCount} />}
          />
        </m.div>

        {/* ─── 5. Badges row ─── */}
        {badges.length > 0 && (
          <m.div
            variants={itemVariants}
            className="p-3 rounded-2xl"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span className="text-xs font-neo-display font-bold text-white/70">
                {t('blast.results.badgesEarned')}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {badges.map((b) => {
                const Icon = BADGE_ICON_MAP[b.icon] ?? Sparkles;
                return (
                <div
                  key={b.id}
                  className="relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-neo-body text-white/90"
                  style={{
                    background: 'rgba(255,215,0,0.08)',
                    border: '1px solid rgba(255,215,0,0.25)',
                  }}
                >
                  <Icon className="w-3 h-3 text-amber-300" />
                  {b.label}
                  {b.isNew && (
                    <span
                      className="absolute -top-1 -right-1 text-[9px] font-black px-1 rounded"
                      style={{ background: '#FF1493', color: '#fff' }}
                    >
                      {t('blast.results.newBadge')}
                    </span>
                  )}
                </div>
                );
              })}
            </div>
          </m.div>
        )}

        {/* ─── 6. Actions ─── */}
        <m.div variants={itemVariants} className="flex gap-3 justify-center mt-2">
          <Button
            onClick={onPlayAgain}
            className="border-3 border-neo-black font-neo-display rounded-xl px-6"
            style={{
              background: 'linear-gradient(180deg, #66FFFF 0%, #00FFFF 50%, #00B3B3 100%)',
              boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.4), 0 4px 0 #008888, 0 6px 12px rgba(0,255,255,0.25)',
              color: '#1a1a2e',
            }}
          >
            <RotateCcw className="w-4 h-4 me-1" />
            {t('blast.playAgain')}
          </Button>
          <Button
            onClick={onBack}
            variant="outline"
            className="border-3 border-neo-lime text-neo-lime bg-neo-navy/80 hover:bg-neo-navy font-neo-display"
          >
            {t('common.back')}
          </Button>
        </m.div>
      </m.div>
    </div>
  );
}

// Small stat tile used in Best Moments / Totals grids
function StatTile({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div
      className="p-3 rounded-xl text-center"
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      <div className="flex items-center justify-center mb-1">{icon}</div>
      <div className="text-lg font-neo-display font-black text-white tabular-nums truncate">
        {value}
      </div>
      <div className="text-[10px] text-white/40 font-neo-body uppercase tracking-wide">
        {label}
      </div>
    </div>
  );
}
