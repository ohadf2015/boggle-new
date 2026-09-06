'use client';

import React, { useMemo, useState } from 'react';
import { Gamepad2, Target, EyeOff, Percent, RefreshCw, Sparkles } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRecentClassroomGames } from '@/hooks/useRecentClassroomGames';
import type { RecentClassroomGame } from '@/lib/supabase/analyticsLastGame';
import { PageLoader } from '@/components/ui/PageLoader';
import { ClassReportSection } from '@/components/teacher/report/ClassReportSection';
import { cn } from '@/lib/utils';

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface LastGameInsightsProps {
  classroomId: string;
  /** Receives the top missed words when the teacher clicks "Practice these words". */
  onCreateReviewLesson?: (words: string[]) => void;
  /** How many recent games to offer in the selector (default 5). */
  limit?: number;
  className?: string;
}

const REVIEW_CHIP_LIMIT = 6;

const MODE_KEYS: Record<string, string> = {
  classic: 'classic',
  blast: 'blast',
  'word-hunt': 'wordHunt',
  wordHunt: 'wordHunt',
  'wheel-rush': 'wheelRush',
  wheelRush: 'wheelRush',
  'vocab-quiz': 'vocabQuiz',
  vocabQuiz: 'vocabQuiz',
};

const LOCALES: Record<string, string> = {
  en: 'en-US', he: 'he-IL', es: 'es-ES', sv: 'sv-SE', ja: 'ja-JP', ru: 'ru-RU',
};

function formatPlayedAt(iso: string, language: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  try {
    return new Intl.DateTimeFormat(LOCALES[language] ?? 'en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date);
  } catch {
    return date.toLocaleString();
  }
}

// ============================================
// SUB-COMPONENTS
// ============================================

function StatTile({
  testId, value, label, icon, bg, iconFg,
}: {
  testId: string; value: string | number; label: string; icon: React.ReactNode; bg: string; iconFg: string;
}) {
  return (
    <div data-testid={testId} className="rounded-neo border-3 border-black shadow-hard-sm overflow-hidden flex flex-col">
      <div className={cn('px-3 pt-3 pb-2 flex items-center gap-3', bg)}>
        <div className="w-9 h-9 rounded-neo border-3 border-black bg-black flex items-center justify-center shrink-0">
          <span className={iconFg}>{icon}</span>
        </div>
        <div className="text-3xl font-neo-display font-black text-black tabular-nums leading-none">{value}</div>
      </div>
      <div className="bg-neo-cream px-3 py-2 border-t-3 border-black text-xs font-neo-body font-bold text-black text-start">
        {label}
      </div>
    </div>
  );
}

// ============================================
// COMPONENT
// ============================================

/**
 * LastGameInsights — "what happened in the last live game" for teachers.
 *
 * Free (not Pro-gated): one card, three numbers, the words to reteach, and a
 * per-student row. Deep trends stay in AnalyticsDashboard.
 */
export function LastGameInsights({
  classroomId,
  onCreateReviewLesson,
  limit = 5,
  className,
}: LastGameInsightsProps) {
  const { t, language } = useLanguage();
  const { games, isLoading, error, refresh } = useRecentClassroomGames({ classroomId, limit });
  const [selectedCode, setSelectedCode] = useState<string | null>(null);

  const game: RecentClassroomGame | undefined = useMemo(
    () => games.find((g) => g.gameCode === selectedCode) ?? games[0],
    [games, selectedCode]
  );

  const reviewWords = useMemo(
    () => (game ? game.missedWords.filter((w) => w.missedBy > 0).slice(0, REVIEW_CHIP_LIMIT) : []),
    [game]
  );

  const modeLabel = (mode: string) => {
    const key = MODE_KEYS[mode];
    return key ? t(`teacher.lastGame.mode.${key}`) : mode;
  };

  // ==================== LOADING ====================
  if (isLoading) {
    return (
      <div data-testid="last-game-loading" className={cn('flex items-center justify-center py-8', className)}>
        <PageLoader size="md" text={t('teacher.lastGame.loading')} />
      </div>
    );
  }

  // ==================== ERROR ====================
  if (error) {
    return (
      <div
        data-testid="last-game-error"
        role="alert"
        className={cn('rounded-neo border-3 border-black bg-neo-pink shadow-hard-sm p-4 flex flex-wrap items-center gap-3', className)}
      >
        <p className="font-neo-body font-bold text-black flex-1 min-w-0 text-start">{t('teacher.lastGame.error')}</p>
        <button
          type="button"
          onClick={() => { void refresh(); }}
          className="inline-flex items-center gap-2 px-3 py-2 bg-black text-neo-lime font-black font-neo-body text-sm rounded-neo border-3 border-black shadow-hard-sm hover:-translate-y-0.5 transition-all duration-100"
        >
          <RefreshCw className="w-4 h-4" aria-hidden />
          {t('teacher.lastGame.retry')}
        </button>
      </div>
    );
  }

  // ==================== EMPTY ====================
  if (!game) {
    return (
      <div
        data-testid="last-game-empty"
        className={cn('rounded-neo border-3 border-dashed border-black/40 bg-neo-cream p-6 text-center', className)}
      >
        <Gamepad2 className="w-8 h-8 mx-auto mb-2 text-black/50" aria-hidden />
        <p className="font-neo-display font-black text-black">{t('teacher.lastGame.emptyTitle')}</p>
        <p className="font-neo-body text-sm text-black/70 mt-1">{t('teacher.lastGame.emptyHint')}</p>
      </div>
    );
  }

  // ==================== DATA ====================
  const { played, roster } = game.participation;

  return (
    <section
      data-testid="last-game-insights"
      aria-label={t('teacher.lastGame.title')}
      className={cn('rounded-neo border-3 border-black shadow-hard bg-neo-cream overflow-hidden', className)}
    >
      {/* Header */}
      <header data-testid="last-game-header" className="bg-neo-lime border-b-3 border-black px-4 py-3 flex flex-wrap items-center gap-3">
        <div className="w-11 h-11 rounded-neo border-3 border-black bg-black flex items-center justify-center shrink-0 shadow-hard-sm">
          <Gamepad2 className="w-6 h-6 text-neo-lime" aria-hidden />
        </div>
        <div className="flex-1 min-w-0 text-start">
          <h3 className="font-neo-display font-black text-black text-lg leading-tight">{t('teacher.lastGame.title')}</h3>
          <p className="font-neo-body text-sm font-bold text-black/80 flex flex-wrap items-center gap-x-2">
            <span>{modeLabel(game.gameMode)}</span>
            <span aria-hidden>·</span>
            <span>{formatPlayedAt(game.playedAt, language)}</span>
            <span aria-hidden>·</span>
            <span>{t('teacher.lastGame.playersPlayed', { count: played, roster })}</span>
            <span className="tabular-nums">({played}/{roster})</span>
          </p>
        </div>
        {games.length > 1 && (
          <label className="flex items-center gap-2 text-xs font-neo-body font-bold text-black">
            <span className="sr-only">{t('teacher.lastGame.previousGames')}</span>
            <select
              data-testid="last-game-selector"
              aria-label={t('teacher.lastGame.previousGames')}
              value={game.gameCode}
              onChange={(e) => setSelectedCode(e.target.value)}
              className="rounded-neo border-3 border-black bg-neo-cream px-2 py-1 font-bold text-black shadow-hard-sm focus:outline-hidden focus-visible:ring-2 focus-visible:ring-black"
            >
              {games.map((g) => (
                <option key={g.gameCode} value={g.gameCode}>
                  {formatPlayedAt(g.playedAt, language)} · {modeLabel(g.gameMode)}
                </option>
              ))}
            </select>
          </label>
        )}
      </header>

      <div className="p-4 flex flex-col gap-5">
        {/* Stat tiles */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <StatTile
            testId="last-game-stat-coverage"
            value={`${game.coveragePct}%`}
            label={t('teacher.lastGame.coverage')}
            icon={<Target className="w-5 h-5" aria-hidden />}
            bg="bg-neo-cyan"
            iconFg="text-neo-cyan"
          />
          <StatTile
            testId="last-game-stat-nobody"
            value={game.wordsNobodyFound.length}
            label={t('teacher.lastGame.nobodyFound')}
            icon={<EyeOff className="w-5 h-5" aria-hidden />}
            bg={game.wordsNobodyFound.length > 0 ? 'bg-neo-pink' : 'bg-neo-lime'}
            iconFg={game.wordsNobodyFound.length > 0 ? 'text-neo-pink' : 'text-neo-lime'}
          />
          <StatTile
            testId="last-game-stat-accuracy"
            value={`${game.averageAccuracyPct}%`}
            label={t('teacher.lastGame.avgAccuracy')}
            icon={<Percent className="w-5 h-5" aria-hidden />}
            bg="bg-neo-lime"
            iconFg="text-neo-lime"
          />
        </div>

        {/* Words to review */}
        <div className="text-start">
          <h4 className="font-neo-display font-black text-black text-base mb-2">{t('teacher.lastGame.wordsToReview')}</h4>
          {reviewWords.length === 0 ? (
            <p className="font-neo-body text-sm text-black/70">{t('teacher.lastGame.nothingToReview')}</p>
          ) : (
            <ul className="flex flex-wrap gap-2 list-none p-0 m-0">
              {reviewWords.map((w) => (
                <li
                  key={w.word}
                  data-testid="review-chip"
                  data-word={w.word}
                  className={cn(
                    'inline-flex items-baseline gap-2 px-3 py-1.5 rounded-neo border-3 border-black shadow-hard-sm font-neo-body',
                    w.pct >= 50 ? 'bg-neo-pink' : 'bg-neo-cream'
                  )}
                >
                  <span className="font-black text-black">{w.word}</span>
                  <span className="text-xs font-bold text-black/70 whitespace-nowrap">
                    {t('teacher.lastGame.missedBy')} <span className="tabular-nums">{w.missedBy}/{w.total}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Per-student table */}
        <div className="overflow-x-auto rounded-neo border-3 border-black bg-white">
          <table className="w-full text-sm font-neo-body">
            <thead className="bg-black text-neo-cream">
              <tr>
                <th scope="col" className="px-3 py-2 text-start font-black">{t('teacher.lastGame.student')}</th>
                <th scope="col" className="px-3 py-2 text-end font-black">{t('teacher.lastGame.score')}</th>
                <th scope="col" className="px-3 py-2 text-end font-black">{t('teacher.lastGame.found')}</th>
                <th scope="col" className="px-3 py-2 text-end font-black">{t('teacher.lastGame.missed')}</th>
                <th scope="col" className="px-3 py-2 text-start font-black w-32">{t('teacher.lastGame.lessonWords')}</th>
              </tr>
            </thead>
            <tbody>
              {game.players.map((p) => (
                <tr key={p.studentId} data-testid="student-row" className="border-t-2 border-black/10">
                  <td className="px-3 py-2 text-start font-bold text-black">{p.name}</td>
                  <td className="px-3 py-2 text-end tabular-nums text-black">{p.score}</td>
                  <td data-testid="student-found" className="px-3 py-2 text-end tabular-nums text-black">{p.lessonWordsFound.length}</td>
                  <td data-testid="student-missed" className="px-3 py-2 text-end tabular-nums text-black">{p.lessonWordsMissed.length}</td>
                  <td className="px-3 py-2">
                    <div
                      className="h-3 rounded-sm border-2 border-black bg-neo-cream overflow-hidden"
                      role="progressbar"
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={p.accuracyPct}
                      aria-label={`${p.name}: ${p.accuracyPct}%`}
                    >
                      <div
                        data-testid="student-bar"
                        className={cn('h-full', p.accuracyPct >= 50 ? 'bg-neo-lime' : 'bg-neo-pink')}
                        style={{ width: `${p.accuracyPct}%` }}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Word x student report — who got which word, how the class is
            trending on it, and one student at a time. Free, like the rest of
            this card; the Pro analytics below keep the long-range views. */}
        <div className="border-t-3 border-black/15 pt-4">
          <ClassReportSection
            game={game}
            games={games}
            onCreateReviewLesson={onCreateReviewLesson}
            modeLabel={modeLabel(game.gameMode)}
            playedAtText={formatPlayedAt(game.playedAt, language)}
          />
        </div>

        {/* CTA */}
        {onCreateReviewLesson && reviewWords.length > 0 && (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => onCreateReviewLesson(reviewWords.map((w) => w.word))}
              className={cn(
                'inline-flex items-center gap-2 px-4 py-2 bg-black text-neo-lime',
                'font-black font-neo-body text-sm rounded-neo border-3 border-black shadow-hard-sm',
                'hover:-translate-y-0.5 hover:shadow-hard active:translate-y-0.5 active:shadow-hard-pressed',
                'transition-all duration-100 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-neo-lime'
              )}
            >
              <Sparkles className="w-4 h-4" aria-hidden />
              {t('teacher.lastGame.practiceCta')}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

export default LastGameInsights;
