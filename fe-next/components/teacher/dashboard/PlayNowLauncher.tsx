/**
 * START A GAME — Teacher HQ's host picker, armed on arrival and folded to one
 * "next game" row (last mode + list) above GO LIVE. "Change" unfolds the mode
 * tiles, facts cell and list chips. The class comes from the deck, never here.
 */

'use client';

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Rocket, X, ChevronUp } from 'lucide-react';
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
import { HQ_MODES, hqModeFacts } from '../hq/hqModes';
import { HqModeCard } from '../hq/HqModeCard';
import { HqModeFacts } from '../hq/HqModeFacts';
import { HqLaunchStage } from '../hq/HqLaunchStage';
import { useHqJuice } from '../hq/useHqJuice';
import { PlayNowListChips, type ListChip } from './PlayNowListChips';
import { PlayNowNextRow } from './PlayNowNextRow';
import { readHqLastLaunch, writeHqLastLaunch } from './hqLastLaunch';

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
  const [launching, setLaunching] = useState<{ modeLabel: string; listTitle: string; poster: string } | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [restored, setRestored] = useState(false);
  const panelId = useId();

  useEffect(() => {
    const last = readHqLastLaunch();
    if (last?.mode) setPickedMode(last.mode);
    if (last?.source === 'lesson' && last.lessonId) {
      setPickedSource('recent');
      setPickedLessonId(last.lessonId);
    } else if (last?.source === 'pack' && last.packKey) {
      setPickedSource('packs');
      setPickedPackKey(last.packKey);
    }
    setRestored(true);
  }, []);

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
  const source: PlayNowSource =
    pickedSource === 'recent' && !hasRecent ? 'packs' : pickedSource ?? (hasRecent ? 'recent' : 'packs');
  const available = useMemo<ReadonlySet<PlayNowSource>>(
    () => new Set<PlayNowSource>(hasRecent ? ['recent', 'packs', 'paste'] : ['packs', 'paste']),
    [hasRecent]
  );

  const activeLesson =
    (lessons || []).find((l) => l.id === pickedLessonId) ?? recentLessons[0] ?? null;
  const activePack =
    STARTER_LESSON_PACKS.find((p) => p.nameKey === pickedPackKey) ?? STARTER_LESSON_PACKS[0] ?? null;
  const pastedWords = useMemo(() => parsePastedWords(pasted), [pasted]);

  // Intent and its words resolve together, so the label, the quiz eligibility
  // and the launch can never describe three different lists.
  const armed = useMemo<ArmedLaunch | null>(() => {
    // Never arm while the lessons read is still open: a teacher who taps in
    // that window would host a starter pack when their own list was one tick
    // away (pitfalls class 1).
    if (lessonsLoading || !restored) return null;
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
  }, [lessonsLoading, restored, source, activeLesson, activePack, pastedWords, language, t]);

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
    const hqMode = HQ_MODES.find((md) => md.id === liveMode);
    setLaunching({
      modeLabel: hqMode ? t(hqMode.labelKey, hqMode.labelFallback) : '',
      listTitle: armed.intent.title,
      poster: hqModeFacts(liveMode).poster,
    });
    const intent = armed.intent;
    writeHqLastLaunch(
      intent.source === 'lesson' && intent.lessonId
        ? { mode: liveMode, source: 'lesson', lessonId: intent.lessonId }
        : intent.source === 'pack' && intent.packKey
          ? { mode: liveMode, source: 'pack', packKey: intent.packKey }
          : { mode: liveMode },
    );
    onLaunch({ ...armed.intent, mode: liveMode });
  }, [armed, liveMode, onLaunch, sfx, t]);

  const chipKind: 'lessons' | 'packs' = hasRecent ? 'lessons' : 'packs';
  const chips = useMemo<ListChip[]>(
    () =>
      hasRecent
        ? recentLessons.map((l) => ({ id: l.id, title: l.name, count: l.words?.length ?? 0 }))
                // The two general packs; the language-learner packs stay one "More" away.
        : STARTER_LESSON_PACKS.slice(0, 2).map((p) => ({ id: p.nameKey, title: t(p.nameKey), count: p.words.length })),
    [hasRecent, recentLessons, t]
  );
  const chipCandidate =
    !armed ? null : source === 'recent' ? activeLesson?.id ?? null : source === 'packs' ? activePack?.nameKey ?? null : null;
  const chipSelectedId = chipCandidate && chips.some((c) => c.id === chipCandidate) ? chipCandidate : null;
  const pickChip = useCallback(
    (id: string) => {
      sfx.playTileSelectSound();
      if (chipKind === 'lessons') {
        setPickedSource('recent');
        setPickedLessonId(id);
      } else {
        setPickedSource('packs');
        setPickedPackKey(id);
      }
    },
    [chipKind, sfx]
  );
  const openChange = useCallback(() => {
    if (changeRef.current) changeRef.current.open = true;
  }, []);

  const liveHqMode = liveMode ? HQ_MODES.find((md) => md.id === liveMode) ?? null : null;

  return (
    <section
      data-testid="play-now-launcher"
      data-expanded={expanded ? 'true' : 'false'}
      aria-labelledby="play-now-heading"
      className="@container relative flex min-h-0 flex-col overflow-hidden rounded-neo-lg border-2 border-neo-cream/40 bg-neo-navy-light/95 shadow-hard"
    >
      <div className="flex min-h-0 flex-col gap-3 p-3 sm:gap-4 sm:p-5 [@media(orientation:landscape)_and_(max-height:500px)]:gap-1.5! [@media(orientation:landscape)_and_(max-height:500px)]:p-2!">
        <h2
          id="play-now-heading"
          className="font-neo-display text-xs font-bold uppercase leading-none tracking-widest text-neo-white/60 [@media(orientation:landscape)_and_(max-height:500px)]:sr-only"
        >
          {t('academy.hq.startTitle', 'Start a game')}
        </h2>

        <PlayNowNextRow
          mode={liveHqMode}
          list={armed ? { title: armed.intent.title, count: armed.words.length } : null}
          expanded={expanded}
          onToggle={() => setExpanded((v) => !v)}
          panelId={panelId}
        />

        {/* The ONE shout on HQ: solid lime, the biggest type, a hard shadow.
            Nothing else on the deck is allowed to out-shout it. */}
        <button
          type="button"
          data-testid="play-now-go"
          disabled={!armed}
          onClick={handleGo}
          className={cn(
            // min-w-0 + overflow-hidden: flex children default to min-width:auto,
            // so a long locale ("יוצאים לדרך") at text-3xl blew past a 320px
            // phone and forced the shell to scroll sideways (#1173).
            'relative flex min-h-14 w-full min-w-0 shrink-0 items-center justify-center gap-3 overflow-hidden rounded-neo border-3 border-black px-3 py-1.5 sm:min-h-16 sm:px-6 sm:py-2',
            'font-neo-display text-3xl font-black uppercase tracking-tight max-[360px]:text-xl sm:min-h-20 sm:text-4xl',
            // `!`: globals.css pads every landscape-phone <button> 0.75rem, unlayered,
            // which beats any layered utility.
            '[@media(orientation:landscape)_and_(max-height:500px)]:min-h-10 [@media(orientation:landscape)_and_(max-height:500px)]:py-0.5! [@media(orientation:landscape)_and_(max-height:500px)]:text-2xl max-sm:[@media(max-height:700px)]:min-h-12 max-sm:[@media(max-height:700px)]:py-1',
            // Never a geometric transition: a button that moves under the pointer
            // fails Playwright's stability check and shifts under a finger.
            // Press feel is shadow + brightness only.
            'transition-[box-shadow,filter] duration-100 focus:outline-hidden focus-visible:ring-4 focus-visible:ring-neo-cyan',
            armed
              ? 'bg-neo-lime text-black shadow-hard-xl hover:shadow-hard-2xl hover:brightness-105 active:shadow-hard-pressed active:brightness-95'
              : 'cursor-not-allowed bg-neo-cream text-neo-gray shadow-hard-sm'
          )}
        >
          <Rocket className="size-8 shrink-0 sm:size-10 [@media(orientation:landscape)_and_(max-height:500px)]:size-6 max-sm:[@media(max-height:700px)]:size-6" strokeWidth={3} aria-hidden="true" />
          <span className="min-w-0 truncate">{t('teacher.playNow.goLive')}</span>
        </button>

        {expanded ? (
          <div id={panelId} data-testid="play-now-picker" className="flex flex-col gap-3 sm:gap-4">
            <div
              role="radiogroup"
              aria-label={t('academy.hq.pickGame', 'Pick a game')}
              // Two per row at desktop: four-in-a-row squeezes a chip to ~150px
              // and the mode's NAME truncates — the verb must get the pixels.
              className="grid shrink-0 grid-cols-2 gap-2 pt-1 sm:gap-3 sm:pt-1.5 [@media(orientation:landscape)_and_(max-height:500px)]:gap-1.5! [@media(orientation:landscape)_and_(max-height:500px)]:pt-0.5!"
            >
              {HQ_MODES.map((mode) => (
                <HqModeCard
                  key={mode.id}
                  mode={mode}
                  label={t(mode.labelKey, mode.labelFallback)}
                  blurb={t(mode.blurbKey, mode.blurbFallback)}
                  tagline={t(hqModeFacts(mode.id).tagKey)}
                  selected={liveMode === mode.id}
                  disabled={mode.id === 'vocab-quiz' && !!armed && !quizReady && !quizSwapsToPack}
                  reduced={reduced}
                  onSelect={() => pickMode(mode.id)}
                />
              ))}
              <HqModeFacts modeId={liveMode} reduced={reduced} />
            </div>

            <PlayNowListChips
              kind={chipKind}
              chips={chips}
              selectedId={chipSelectedId}
              offChipLabel={
                armed
                  ? t('teacher.playNow.armedWith', { title: armed.intent.title, count: armed.words.length })
                  : t('teacher.playNow.pickSomething')
              }
              onSelect={pickChip}
              onMore={openChange}
            />
            {/* Everything in here exists to CHANGE the default words, never to
                reach it. Opens as a sheet over this card, so it never grows the
                deck past the viewport. */}
            <details ref={changeRef} data-testid="play-now-change-disclosure" className="group shrink-0">
              <summary
                data-testid="play-now-change-summary"
                // Phones reach this sheet from the chips' "More"; the link stays for keyboards (visible on focus).
                className="flex cursor-pointer list-none items-center justify-center gap-1.5 marker:content-none max-sm:sr-only max-sm:focus-visible:not-sr-only [@media(orientation:landscape)_and_(max-height:500px)]:sr-only [@media(orientation:landscape)_and_(max-height:500px)]:focus-visible:not-sr-only"
              >
                <ChevronUp className="size-4 text-neo-white/60" aria-hidden="true" />
                <p className="font-neo-body text-xs font-bold text-neo-white/60 underline decoration-1 underline-offset-2">
                  {t('teacher.playNow.changeWords')}
                </p>
              </summary>

              <div
                data-hq-sheet="change-words"
                className="absolute inset-0 z-20 hidden flex-col gap-3 overflow-y-auto group-open:flex overscroll-contain bg-neo-navy p-3"
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
                          onSelect={() => {
                            setPickedLessonId(l.id);
                            closeChange();
                          }}
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
                          onSelect={() => {
                            setPickedPackKey(p.nameKey);
                            closeChange();
                          }}
                        />
                      </li>
                    ))}
                  </ul>
                )}

                {source === 'paste' && <PastePanel value={pasted} words={pastedWords} onChange={setPasted} />}
              </div>
            </details>
          </div>
        ) : null}
      </div>
      {/* Portalled: the section is a size container, which would trap a fixed layer inside it. */}
      {launching ? createPortal(<HqLaunchStage {...launching} />, document.body) : null}
    </section>
  );
}

export default PlayNowLauncher;
