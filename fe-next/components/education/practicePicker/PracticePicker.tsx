'use client';

/**
 * PracticePicker — one word list, many games.
 *
 * A tile per practice type the lesson can drive, each showing the skill it
 * drills and how much material the lesson actually supplies. Locked tiles stay
 * on the board on purpose: "add synonyms to unlock" is how a student sees the
 * lesson has more in it, and how a teacher learns what to fill in.
 *
 * The readiness model is pure and lives in `lib/education/practicePicker`.
 */

import { useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { DirectionalIcon } from '@/components/ui/DirectionalIcon';
import {
  ArrowLeft,
  Grid3X3,
  Zap,
  Timer,
  Shuffle,
  PenLine,
  Layers,
  List,
  BookOpen,
  Sparkles,
  ArrowLeftRight,
  Quote,
  Blocks,
  Lock,
  CheckCircle,
  Clock,
  Target,
} from 'lucide-react';
import type { PracticeType, MasteryLevel } from '@/hooks/usePracticeSession';
import type { VocabularyWord } from '@/lib/supabase/education/types';
import type { VocabFocus } from '@/lib/education/vocabFocus';
import {
  buildPracticeTiles,
  practiceReadiness,
  type PracticeSessionCounts,
  type PracticeTile,
} from '@/lib/education/practicePicker';

export interface PracticePickerProps {
  lessonName: string;
  words: VocabularyWord[];
  /** Lesson language — decides whether built-in distractor banks apply. */
  language?: string;
  /** The student's mastery of this lesson, shown beside the readiness line. */
  mastery?: MasteryLevel;
  /** Finished-session totals, so each tile can show what has been played. */
  sessions?: PracticeSessionCounts | null;
  onSelectMode: (mode: PracticeType, options?: { focus?: VocabFocus }) => void;
  onBack: () => void;
}

/** Mastery badge, carried over from the mode selector this picker replaced. */
const MASTERY_LOOK: Record<string, { icon: typeof CheckCircle; className: string }> = {
  mastered: { icon: CheckCircle, className: 'text-neo-cyan' },
  practicing: { icon: Clock, className: 'text-neo-yellow' },
  started: { icon: Target, className: 'text-neo-orange' },
};

/** Icon and accent per tile, keyed by the model's stable tile id. */
const TILE_LOOK: Record<string, { icon: typeof Grid3X3; accent: string }> = {
  solo_board: { icon: Grid3X3, accent: 'bg-neo-cyan' },
  warmup: { icon: Zap, accent: 'bg-neo-pink' },
  blitz: { icon: Timer, accent: 'bg-neo-pink' },
  matching: { icon: Shuffle, accent: 'bg-neo-lime' },
  spelling: { icon: PenLine, accent: 'bg-neo-purple' },
  flashcard: { icon: Layers, accent: 'bg-neo-cyan' },
  word_list: { icon: List, accent: 'bg-neo-lime' },
  'vocab_focus:definition': { icon: BookOpen, accent: 'bg-neo-cyan' },
  'vocab_focus:synonym': { icon: Sparkles, accent: 'bg-neo-lime' },
  'vocab_focus:antonym': { icon: ArrowLeftRight, accent: 'bg-neo-pink' },
  'vocab_focus:context': { icon: Quote, accent: 'bg-neo-purple' },
  'vocab_focus:multiple_meaning': { icon: Layers, accent: 'bg-neo-purple' },
  'vocab_focus:roots_affixes': { icon: Blocks, accent: 'bg-neo-cyan' },
};

const FALLBACK_LOOK = { icon: Grid3X3, accent: 'bg-neo-cyan' };

function TileCard({
  tile,
  onSelect,
}: {
  tile: PracticeTile;
  onSelect: (tile: PracticeTile) => void;
}) {
  const { t } = useLanguage();
  const look = TILE_LOOK[tile.id] ?? FALLBACK_LOOK;
  const Icon = tile.ready ? look.icon : Lock;
  const badge =
    tile.countKind === 'questions'
      ? t('education.practicePicker.questions', { count: tile.count })
      : t('education.practicePicker.words', { count: tile.count });

  return (
    <button
      type="button"
      data-testid={`practice-tile-${tile.id}`}
      disabled={!tile.ready}
      aria-disabled={!tile.ready}
      onClick={() => tile.ready && onSelect(tile)}
      className={cn(
        'group flex flex-col text-start rounded-neo border-3 border-black overflow-hidden min-h-40 transition-all',
        tile.ready
          ? 'bg-neo-cream shadow-hard hover:shadow-hard-lg hover:-translate-y-0.5 active:shadow-hard-pressed active:translate-y-0.5'
          : 'bg-neo-cream/40 border-black/30 cursor-not-allowed'
      )}
    >
      {/* Accent strip doubles as the tile's colour code */}
      <span className={cn('h-2 w-full', tile.ready ? look.accent : 'bg-black/20')} aria-hidden="true" />
      <span className="flex flex-col gap-2 p-4 flex-1">
        <span className="flex items-center gap-2">
          <span
            className={cn(
              'w-10 h-10 rounded-neo border-2 border-black flex items-center justify-center shrink-0',
              tile.ready ? look.accent : 'bg-black/10 border-black/30'
            )}
          >
            <Icon className={cn('w-5 h-5', tile.ready ? 'text-black' : 'text-black/50')} aria-hidden="true" />
          </span>
          <span
            className={cn(
              'font-neo-display font-black uppercase leading-tight text-balance',
              tile.ready ? 'text-black' : 'text-black/50'
            )}
          >
            {t(tile.titleKey)}
          </span>
        </span>

        <span
          className={cn(
            'text-xs font-neo-body font-bold text-pretty',
            tile.ready ? 'text-black/70' : 'text-black/45'
          )}
        >
          {tile.ready ? t(tile.skillKey) : t(tile.lockedKey ?? tile.skillKey, { min: 4 })}
        </span>

        <span className="mt-auto pt-1 flex flex-wrap items-center gap-1.5">
          <span
            className={cn(
              'inline-block text-[11px] font-neo-body font-black uppercase tabular-nums px-2 py-0.5 rounded-neo border-2 border-black',
              tile.ready ? 'bg-neo-yellow text-black' : 'bg-black/10 text-black/50 border-black/30'
            )}
          >
            {tile.ready ? badge : t('education.practicePicker.lockedBadge')}
          </span>
          {tile.sessions > 0 && (
            <span
              data-testid={`practice-tile-plays-${tile.id}`}
              className="inline-block text-[11px] font-neo-body font-bold tabular-nums text-black/60"
            >
              {t('education.practicePicker.played', { count: tile.sessions })}
            </span>
          )}
        </span>
      </span>
    </button>
  );
}

export default function PracticePicker({
  lessonName,
  words,
  language,
  mastery,
  sessions,
  onSelectMode,
  onBack,
}: PracticePickerProps) {
  const { t } = useLanguage();
  const tiles = useMemo(
    () => buildPracticeTiles(words, { language, sessions }),
    [words, language, sessions]
  );
  const readiness = useMemo(() => practiceReadiness(tiles), [tiles]);
  const masteryLook = mastery && mastery !== 'not_started' ? MASTERY_LOOK[mastery] : undefined;
  const MasteryIcon = masteryLook?.icon;

  const handleSelect = (tile: PracticeTile) => {
    onSelectMode(tile.mode, tile.focus ? { focus: tile.focus } : undefined);
  };

  return (
    <div className="w-full">
      <div className="flex items-center gap-3 mb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          aria-label={t('common.back')}
          className="text-neo-white hover:text-neo-white hover:bg-neo-white/10"
        >
          <DirectionalIcon icon={ArrowLeft} className="w-5 h-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-neo-display text-neo-white text-balance">
            {t('education.practicePicker.title')}
          </h1>
          <p className="text-sm text-neo-white/80 font-neo-body truncate">{lessonName}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-3">
        <p data-testid="practice-picker-readiness" className="text-xs font-neo-body text-neo-white/70 tabular-nums">
          {t('education.practicePicker.readyCount', { ready: readiness.ready, total: readiness.total })}
        </p>
        {masteryLook && MasteryIcon && (
          <p
            data-testid="practice-picker-mastery"
            className={cn('flex items-center gap-1 text-xs font-neo-body font-bold', masteryLook.className)}
          >
            <MasteryIcon className="w-4 h-4" aria-hidden="true" />
            {t(`education.practice.mastery.${mastery}`)}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {tiles.map((tile) => (
          <TileCard key={tile.id} tile={tile} onSelect={handleSelect} />
        ))}
      </div>

      {readiness.ready === 0 && (
        <p role="status" className="mt-4 text-sm font-neo-body text-neo-white/80 text-pretty">
          {t('education.practicePicker.nothingReady')}
        </p>
      )}
    </div>
  );
}
