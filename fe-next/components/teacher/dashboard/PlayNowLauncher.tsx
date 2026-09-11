/**
 * PLAY NOW — the one thing the teacher dashboard is for.
 *
 * The bar is Kahoot: a teacher who just walked into a noisy room gets a join
 * code on the projector before the bell stops ringing. Kahoot's host screen
 * still costs a kahoot you prepared earlier plus two option screens. This one
 * arms itself on arrival — a source picked, an item selected, defaults chosen —
 * so the whole flow is a single press of one enormous button.
 *
 * What it deliberately does NOT ask for:
 *  - a classroom (the express lobby provisions one silently if there is none)
 *  - a roster (students join with the code, same as Kahoot)
 *  - a lesson (a starter pack or a pasted list becomes one on the way)
 *  - a game mode, timer or board size (derived — see pickQuickLaunchMode)
 */

'use client';

import { useCallback, useMemo, useState } from 'react';
import { Rocket, Zap } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { useLessons } from '@/hooks/useVocabularyLesson';
import { useRecentGameSettings } from '@/hooks/useRecentGameSettings';
import { EDUCATION_LANGUAGES } from '@/lib/supabase/education/types';
import {
  MIN_PASTED_WORDS,
  parsePastedWords,
  type QuickLaunchIntent,
} from './quickLaunchIntent';
import { SourceSwitch, PickRow, PastePanel, STARTER_PACKS, type PlayNowSource } from './PlayNowSources';

/**
 * How many saved lists fit on the panel before it stops being one glance.
 * Three, not four: a row of four is a menu to read, and the panel is already
 * armed with the top one — the list is there to CHANGE the default, not to
 * make the teacher choose before they can play.
 */
const RECENT_LIMIT = 3;

export interface PlayNowLauncherProps {
  /** Hand the resolved intent to the dashboard, which stores it and navigates. */
  onLaunch: (intent: Omit<QuickLaunchIntent, 'createdAt'>) => void;
}

export function PlayNowLauncher({ onLaunch }: PlayNowLauncherProps) {
  const { t, language } = useLanguage();
  const { lessons, isLoading: lessonsLoading } = useLessons();
  const { recentConfigs } = useRecentGameSettings();

  // `null` means "the teacher has not touched the switch" — the source is then
  // derived from what they actually have, at render, from one place. Storing a
  // resolved default in state instead would let the lessons read land after it
  // and leave the panel armed with the wrong thing (pitfalls class 1).
  const [pickedSource, setPickedSource] = useState<PlayNowSource | null>(null);
  const [pickedLessonId, setPickedLessonId] = useState<string | null>(null);
  const [pickedPackKey, setPickedPackKey] = useState<string | null>(null);
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
    STARTER_PACKS.find((p) => p.nameKey === pickedPackKey) ?? STARTER_PACKS[0] ?? null;
  const pastedWords = useMemo(() => parsePastedWords(pasted), [pasted]);

  const intent = useMemo<Omit<QuickLaunchIntent, 'createdAt'> | null>(() => {
    // Never arm while the lessons read is still open: a teacher who taps in
    // that window would host a starter pack when their own list was one tick
    // away (pitfalls class 1 — render the pessimistic state until all sources
    // have resolved).
    if (lessonsLoading) return null;
    if (source === 'recent') {
      if (!activeLesson) return null;
      return {
        source: 'lesson',
        lessonId: activeLesson.id,
        title: activeLesson.name,
        language: activeLesson.language || language,
      };
    }
    if (source === 'packs') {
      if (!activePack) return null;
      return {
        source: 'pack',
        packKey: activePack.nameKey,
        title: t(activePack.nameKey),
        language: activePack.language,
      };
    }
    if (pastedWords.length < MIN_PASTED_WORDS) return null;
    const uiLanguage = (EDUCATION_LANGUAGES as readonly string[]).includes(language)
      ? language
      : 'en';
    return {
      source: 'paste',
      words: pastedWords,
      title: t('teacher.playNow.pastedRoundName'),
      language: uiLanguage,
    };
  }, [lessonsLoading, source, activeLesson, activePack, pastedWords, language, t]);

  const wordCount =
    source === 'recent'
      ? activeLesson?.words?.length ?? 0
      : source === 'packs'
        ? activePack?.words.length ?? 0
        : pastedWords.length;

  const handleGo = useCallback(() => {
    if (!intent) return;
    onLaunch(intent);
  }, [intent, onLaunch]);

  return (
    <section
      data-testid="play-now-launcher"
      aria-labelledby="play-now-heading"
      className="rounded-neo-lg border-4 border-black bg-neo-navy-light shadow-hard-lg overflow-hidden"
    >
      {/* The loud bit. A lime slab across the top so the eye lands here first
          and nowhere else on the page. */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b-4 border-black bg-neo-lime px-5 py-3">
        <Zap className="size-6 shrink-0 text-black" strokeWidth={3} aria-hidden="true" />
        <h2 id="play-now-heading" className="font-neo-display text-2xl font-black uppercase tracking-tight text-black sm:text-3xl">
          {t('teacher.playNow.title')}
        </h2>
        <p className="font-neo-body text-sm font-bold text-black/70">{t('teacher.playNow.subtitle')}</p>
      </div>

      <div className="space-y-3 px-4 py-4 sm:px-5">
        {/* What is already loaded. Said BEFORE the button, because it is the
            one thing a teacher needs to know before pressing it. */}
        <p
          data-testid="play-now-armed"
          className="text-center font-neo-body text-sm font-bold text-neo-white text-balance"
        >
          {intent
            ? t('teacher.playNow.armedWith', { title: intent.title, count: wordCount })
            : t('teacher.playNow.pickSomething')}
        </p>

        {/* One dominant action, and it comes FIRST. Measured live at 390x844 it
            used to sit at y=688 — under a source switch and a three-row list
            the teacher never had to touch, because the panel arms itself. */}
        <button
          type="button"
          data-testid="play-now-go"
          disabled={!intent}
          onClick={handleGo}
          className={cn(
            'flex w-full min-h-16 items-center justify-center gap-3 rounded-neo border-4 border-black px-6 py-4',
            'font-neo-display text-2xl font-black uppercase tracking-tight sm:text-3xl',
            'transition-all duration-100 focus:outline-hidden focus-visible:ring-4 focus-visible:ring-neo-cyan',
            intent
              ? 'bg-neo-lime text-black shadow-hard-lg hover:-translate-y-1 hover:shadow-hard-xl active:translate-y-0.5 active:shadow-hard-pressed'
              // Still bordered, still legible: this is the state a teacher
              // sees on first paint, while the lessons read is open. A solid
              // fill rather than `cream/70` — a Tailwind v4 opacity modifier
              // computes to `oklab(…)`, which reads as no fill at all.
              : 'cursor-not-allowed bg-neo-cream text-neo-gray shadow-hard-sm'
          )}
        >
          <Rocket className="size-7 shrink-0" strokeWidth={3} aria-hidden="true" />
          {t('teacher.playNow.goLive')}
        </button>

        <p className="text-center font-neo-body text-xs font-bold text-neo-white/70">
          {t('teacher.playNow.noSetupNeeded')}
        </p>

        {/* Everything below the line exists to CHANGE the default, never to
            reach it. Hence the label, and hence its place under the button. */}
        <div data-testid="play-now-change" className="space-y-3 border-t-[3px] border-black/50 pt-3">
          <p className="font-neo-display text-xs font-black uppercase tracking-widest text-neo-white/70">
            {t('teacher.playNow.changeWords')}
          </p>

          <SourceSwitch active={source} available={available} onChange={setPickedSource} />

          <div className="min-h-[5.5rem]">
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
                {STARTER_PACKS.map((p, i) => (
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
        </div>
      </div>
    </section>
  );
}

export default PlayNowLauncher;
