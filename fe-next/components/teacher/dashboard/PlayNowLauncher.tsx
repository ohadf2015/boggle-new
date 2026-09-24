/**
 * START A GAME — the hero of Teacher HQ.
 *
 * The bar is Kahoot: a teacher who just walked into a noisy room gets a join
 * code on the projector before the bell stops ringing. This panel arms itself
 * on arrival — a word list picked, a game picked, defaults chosen — so the
 * whole flow is still a single press of one enormous button.
 *
 * What changed for HQ: the game is now a visible choice. Four illustrated mode
 * cards (Academy node art) sit above START, one always pre-selected — the game
 * the armed words can actually carry — so choosing is optional and START stays
 * one tap. What it deliberately still does NOT ask for: a roster, a lesson
 * (a starter pack or a pasted list becomes one on the way), a timer or a board
 * size. The class comes from the deck's class chips, never from here.
 */

'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { Rocket, Zap, X, ChevronUp } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { useLessons } from '@/hooks/useVocabularyLesson';
import { useRecentGameSettings } from '@/hooks/useRecentGameSettings';
import { EDUCATION_LANGUAGES } from '@/lib/supabase/education/types';
import type { ClassroomGameMode } from '@/shared/types/vocabQuiz';
import {
  MIN_PASTED_WORDS,
  parsePastedWords,
  pickQuickLaunchMode,
  resolveIntentMode,
  type QuickLaunchIntent,
} from './quickLaunchIntent';
import { SourceSwitch, PickRow, PastePanel, type PlayNowSource } from './PlayNowSources';
import { STARTER_LESSON_PACKS } from '@/lib/education/starterLessonPacks';
import { HQ_MODES } from '../hq/hqModes';
import { HqModeCard } from '../hq/HqModeCard';
import { useHqJuice } from '../hq/useHqJuice';

/**
 * How many saved lists fit on the panel before it stops being one glance.
 * Three, not four: a row of four is a menu to read, and the panel is already
 * armed with the top one — the list is there to CHANGE the default, not to
 * make the teacher choose before they can play.
 */
const RECENT_LIMIT = 3;

type WordLike = { word?: string; definition?: string | null };

/** What the button will launch, and the count its label shows — one source. */
interface ArmedLaunch {
  intent: Omit<QuickLaunchIntent, 'createdAt' | 'mode'>;
  words: WordLike[];
}

export interface PlayNowLauncherProps {
  /** Hand the resolved intent to the dashboard, which stores it and navigates. */
  onLaunch: (intent: Omit<QuickLaunchIntent, 'createdAt'>) => void;
}

export function PlayNowLauncher({ onLaunch }: PlayNowLauncherProps) {
  const { t, language } = useLanguage();
  const { lessons, isLoading: lessonsLoading } = useLessons();
  const { recentConfigs } = useRecentGameSettings();
  const { reduced, sfx } = useHqJuice();
  const changeRef = useRef<HTMLDetailsElement>(null);

  // `null` means "the teacher has not touched it" — the value is then derived
  // at render from what they actually have, from one place (pitfalls class 1).
  const [pickedSource, setPickedSource] = useState<PlayNowSource | null>(null);
  const [pickedLessonId, setPickedLessonId] = useState<string | null>(null);
  const [pickedPackKey, setPickedPackKey] = useState<string | null>(null);
  const [pickedMode, setPickedMode] = useState<ClassroomGameMode | null>(null);
  const [pasted, setPasted] = useState('');

  // Lists the teacher actually hosted recently float above the ones they merely
  // saved — "recent" should mean recent play, not recent typing.
  const recentLessons = useMemo(() => {
    const playedOrder = new Map<string, number>();
    (recentConfigs || []).forEach((c, i) => {
      (c.lessonIds || []).forEach((id) => {
        if (!playedOrder.has(id)) playedOrder.set(id, i);
      });
    });
    return [...(lessons || [])]
      .sort((a, b) => {
        const ai = playedOrder.get(a.id) ?? Number.MAX_SAFE_INTEGER;
        const bi = playedOrder.get(b.id) ?? Number.MAX_SAFE_INTEGER;
        return ai - bi;
      })
      .slice(0, RECENT_LIMIT);
  }, [lessons, recentConfigs]);

  const hasRecent = recentLessons.length > 0;
  const source: PlayNowSource = pickedSource ?? (hasRecent ? 'recent' : 'packs');
  const available = useMemo<ReadonlySet<PlayNowSource>>(
    () => new Set<PlayNowSource>(hasRecent ? ['recent', 'packs', 'paste'] : ['packs', 'paste']),
    [hasRecent]
  );

  const activeLesson =
    recentLessons.find((l) => l.id === pickedLessonId) ?? recentLessons[0] ?? null;
  const activePack =
    STARTER_LESSON_PACKS.find((p) => p.nameKey === pickedPackKey) ?? STARTER_LESSON_PACKS[0] ?? null;
  const pastedWords = useMemo(() => parsePastedWords(pasted), [pasted]);

  // Intent and its words resolve together, so the label, the quiz eligibility
  // and the launch can never describe three different lists.
  const armed = useMemo<ArmedLaunch | null>(() => {
    // Never arm while the lessons read is still open: a teacher who taps in
    // that window would host a starter pack when their own list was one tick
    // away (pitfalls class 1).
    if (lessonsLoading) return null;
    if (source === 'recent') {
      if (!activeLesson) return null;
      return {
        intent: {
          source: 'lesson',
          lessonId: activeLesson.id,
          title: activeLesson.name,
          language: activeLesson.language || language,
        },
        words: activeLesson.words || [],
      };
    }
    if (source === 'packs') {
      if (!activePack) return null;
      return {
        intent: {
          source: 'pack',
          packKey: activePack.nameKey,
          title: t(activePack.nameKey),
          language: activePack.language,
        },
        words: activePack.words,
      };
    }
    if (pastedWords.length < MIN_PASTED_WORDS) return null;
    const uiLanguage = (EDUCATION_LANGUAGES as readonly string[]).includes(language)
      ? language
      : 'en';
    return {
      intent: {
        source: 'paste',
        words: pastedWords,
        title: t('teacher.playNow.pastedRoundName'),
        language: uiLanguage,
      },
      words: pastedWords.map((word) => ({ word })),
    };
  }, [lessonsLoading, source, activeLesson, activePack, pastedWords, language, t]);

  // The same rule the express runner applies — a quiz card is only on offer
  // when the armed words carry definitions for it to ask about.
  const quizReady = armed ? pickQuickLaunchMode(armed.words) === 'vocab-quiz' : false;
  const liveMode: ClassroomGameMode | null = armed ? resolveIntentMode(pickedMode, armed.words) : null;

  // A saved list with no definitions cannot carry a quiz — but the quiz is the
  // most-played mode, so its card never dead-ends: tapping it swaps the words
  // for a starter pack that does carry definitions. Pasted words stay the
  // teacher's explicit choice, so there the card is honestly unavailable.
  const quizSwapsToPack = !!armed && !quizReady && source === 'recent';
  const pickMode = useCallback(
    (mode: ClassroomGameMode) => {
      sfx.playTileSelectSound();
      if (mode === 'vocab-quiz' && quizSwapsToPack) setPickedSource('packs');
      setPickedMode(mode);
    },
    [sfx, quizSwapsToPack]
  );

  const closeChange = useCallback(() => {
    if (changeRef.current) changeRef.current.open = false;
  }, []);

  const handleGo = useCallback(() => {
    if (!armed || !liveMode) return;
    sfx.playMatchStartSound();
    onLaunch({ ...armed.intent, mode: liveMode });
  }, [armed, liveMode, onLaunch, sfx]);

  return (
    <section
      data-testid="play-now-launcher"
      aria-labelledby="play-now-heading"
      className="relative flex h-full min-h-0 flex-col overflow-hidden rounded-neo-lg border-3 border-neo-cream bg-neo-navy-light/95 shadow-hard-xl"
    >
      <div className="flex shrink-0 items-center gap-2 border-b-3 border-neo-black bg-neo-lime px-3 py-1.5 sm:px-4 sm:py-2">
        <Zap className="size-5 shrink-0 text-black" strokeWidth={3} aria-hidden="true" />
        <h2
          id="play-now-heading"
          className="font-neo-display text-lg font-black uppercase leading-none tracking-tight text-black sm:text-2xl"
        >
          {t('academy.hq.startTitle', 'Start a game')}
        </h2>
        <p className="ms-auto hidden truncate font-neo-body text-sm font-bold text-black/70 md:block">
          {t('teacher.playNow.subtitle')}
        </p>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-2 p-2 sm:gap-3 sm:p-3">
        <div
          role="radiogroup"
          aria-label={t('academy.hq.pickGame', 'Pick a game')}
          className="grid min-h-0 flex-1 grid-cols-4 gap-2 pt-2 sm:gap-3 lg:grid-cols-2 lg:grid-rows-2 lg:gap-4"
        >
          {HQ_MODES.map((mode) => (
            <HqModeCard
              key={mode.id}
              mode={mode}
              label={t(mode.labelKey, mode.labelFallback)}
              blurb={t(mode.blurbKey, mode.blurbFallback)}
              selected={liveMode === mode.id}
              disabled={mode.id === 'vocab-quiz' && !!armed && !quizReady && !quizSwapsToPack}
              reduced={reduced}
              onSelect={() => pickMode(mode.id)}
            />
          ))}
        </div>

        {/* What is already loaded, said BEFORE the button. */}
        <p
          data-testid="play-now-armed"
          className="shrink-0 truncate text-center font-neo-body text-xs font-bold text-neo-white sm:text-sm"
        >
          {armed
            ? t('teacher.playNow.armedWith', { title: armed.intent.title, count: armed.words.length })
            : t('teacher.playNow.pickSomething')}
        </p>

        <button
          type="button"
          data-testid="play-now-go"
          disabled={!armed}
          onClick={handleGo}
          className={cn(
            'flex min-h-14 w-full shrink-0 items-center justify-center gap-3 rounded-neo border-3 border-black px-6 py-2',
            'font-neo-display text-2xl font-black uppercase tracking-tight sm:min-h-16 sm:text-3xl',
            'transition-all duration-100 focus:outline-hidden focus-visible:ring-4 focus-visible:ring-neo-cyan',
            armed
              ? 'bg-neo-lime text-black shadow-hard-lg hover:-translate-y-1 hover:shadow-hard-xl active:translate-y-0.5 active:shadow-hard-pressed'
              : 'cursor-not-allowed bg-neo-cream text-neo-gray shadow-hard-sm'
          )}
        >
          <Rocket className="size-7 shrink-0" strokeWidth={3} aria-hidden="true" />
          {t('teacher.playNow.goLive')}
        </button>

        {/* Everything in here exists to CHANGE the default words, never to
            reach it. Opens as a sheet over this card, so it never grows the
            deck past the viewport. */}
        <details ref={changeRef} data-testid="play-now-change-disclosure" className="group shrink-0">
          <summary
            data-testid="play-now-change-summary"
            className="flex cursor-pointer list-none items-center justify-center gap-1.5 marker:content-none"
          >
            <ChevronUp className="size-4 text-neo-white/80" aria-hidden="true" />
            <p className="font-neo-display text-[0.7rem] font-black uppercase tracking-widest text-neo-white/80 underline decoration-2 underline-offset-2">
              {t('teacher.playNow.changeWords')}
            </p>
          </summary>

          <div
            data-hq-sheet="change-words"
            className="absolute inset-0 z-20 flex flex-col gap-3 overflow-y-auto overscroll-contain bg-neo-navy p-3"
            onKeyDown={(e) => {
              if (e.key === 'Escape') closeChange();
            }}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="font-neo-display text-sm font-black uppercase tracking-wide text-neo-white">
                {t('teacher.playNow.changeWords')}
              </p>
              <button
                type="button"
                data-testid="play-now-change-close"
                onClick={closeChange}
                aria-label={t('common.close')}
                className="flex size-9 items-center justify-center rounded-neo border-3 border-neo-cream bg-neo-navy-light text-neo-white shadow-hard-sm"
              >
                <X className="size-4" strokeWidth={3} aria-hidden="true" />
              </button>
            </div>
            <SourceSwitch active={source} available={available} onChange={setPickedSource} />

            {source === 'recent' && (
              <ul className="grid gap-2 sm:grid-cols-2" data-testid="play-now-recent-list">
                {recentLessons.map((l, i) => (
                  <li key={l.id}>
                    <PickRow
                      testId={`play-now-lesson-${l.id}`}
                      title={l.name}
                      meta={t('teacher.lesson.words', { count: l.words?.length ?? 0 })}
                      accent="bg-neo-cyan"
                      recommendedLabel={i === 0 ? t('teacher.playNow.recommended') : undefined}
                      selected={activeLesson?.id === l.id}
                      onSelect={() => setPickedLessonId(l.id)}
                    />
                  </li>
                ))}
              </ul>
            )}

            {source === 'packs' && (
              <ul className="grid gap-2 sm:grid-cols-3" data-testid="play-now-pack-list">
                {STARTER_LESSON_PACKS.map((p, i) => (
                  <li key={p.nameKey}>
                    <PickRow
                      testId={`play-now-pack-${p.category}`}
                      title={t(p.nameKey)}
                      meta={t('teacher.lesson.words', { count: p.words.length })}
                      accent="bg-neo-lime"
                      recommendedLabel={i === 0 ? t('teacher.playNow.recommended') : undefined}
                      selected={activePack?.nameKey === p.nameKey}
                      onSelect={() => setPickedPackKey(p.nameKey)}
                    />
                  </li>
                ))}
              </ul>
            )}

            {source === 'paste' && <PastePanel value={pasted} words={pastedWords} onChange={setPasted} />}
          </div>
        </details>
      </div>
    </section>
  );
}

export default PlayNowLauncher;
