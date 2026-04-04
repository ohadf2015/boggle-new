'use client';

import { motion } from 'framer-motion';
import { Star, Zap, RotateCcw, ArrowLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { BlastResultsData } from '@/components/blast/types';

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
      <motion.div
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
            <Zap className="inline w-10 h-10 mr-2 text-neo-cyan" style={{ WebkitTextFillColor: 'initial' }} />
            {t('blast.ready.title')}
          </h1>
          <p className="text-white/50 font-neo-body text-lg">
            {t('blast.ready.subtitle')}
          </p>
        </div>
      </motion.div>

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
        variant="ghost"
        className="text-white/30 hover:text-white/50"
      >
        <ArrowLeft className="w-4 h-4 mr-1" />
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
      <motion.div
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
      </motion.div>

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
  return (
    <div
      className="flex flex-col items-center justify-center min-h-screen p-4 gap-6"
      style={{ background: 'radial-gradient(ellipse at 50% 30%, #2d1b4e 0%, #0f0c29 70%, #080618 100%)' }}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
      >
        <div
          className="text-center p-8 rounded-2xl max-w-sm"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            backdropFilter: 'blur(12px)',
            boxShadow: '0 12px 40px rgba(0,0,0,0.4)',
          }}
        >
          <h2 className="text-2xl font-neo-display font-black text-white/80 mb-2">
            {t('blast.gameOver')}
          </h2>
          <div
            className="text-5xl font-black mb-5"
            style={{
              background: 'linear-gradient(180deg, #FFE566, #FFD700, #B8860B)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.4))',
            }}
          >
            {results?.finalScore ?? 0}
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm text-white/50 mb-4">
            <div>
              <span className="block text-xl font-black text-white tabular-nums">
                {results?.wavesCompleted ?? 0}
              </span>
              {t('blast.waves')}
            </div>
            <div>
              <span className="block text-xl font-black text-white tabular-nums">
                {results?.wordsFound.length ?? 0}
              </span>
              {t('blast.words')}
            </div>
          </div>
        </div>
      </motion.div>

      <div className="flex gap-3">
        <Button
          onClick={onPlayAgain}
          className="border-3 border-neo-black font-neo-display rounded-xl"
          style={{
            background: 'linear-gradient(180deg, #66FFFF 0%, #00FFFF 50%, #00B3B3 100%)',
            boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.4), 0 4px 0 #008888, 0 6px 12px rgba(0,255,255,0.25)',
            color: '#1a1a2e',
          }}
        >
          <RotateCcw className="w-4 h-4 mr-1" />
          {t('blast.playAgain')}
        </Button>
        <Button
          onClick={onBack}
          variant="ghost"
          className="text-white/30 hover:text-white/50 font-neo-display"
        >
          {t('common.back')}
        </Button>
      </div>
    </div>
  );
}
