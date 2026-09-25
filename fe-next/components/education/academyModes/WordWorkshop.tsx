'use client';

/**
 * Word Workshop — Word Craft vs the bot where the student's lesson words are
 * the stars. Builds on the classroom Word Craft homework
 * (practicePicker/WordCraftPractice): same stock game view, same lesson-seeded
 * deal (lib/word-craft/lessonBag), same completion bar
 * (wordCraftAttemptIsMeaningful) — plus a golden callout per lesson word built
 * (exact or contained, lib/education/workshopLessonBonus) and a short phone
 * board (WORKSHOP_DIMS, 7x7) for a 4-6 minute match that opens with the
 * Baron's lesson-word opener already on the board (lib/education/workshopOpener).
 *
 * XP is NOT computed here: `recordResult` goes through the existing practice
 * session path and resolves to the server's number.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Coins, Hammer, RotateCcw, Star } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { WordCraftGameView } from '@/components/word-craft/WordCraftGameScreen';
import { onWordCraftGameEnd, onWordCraftMove } from '@/components/word-craft/wordCraftTelemetry';
import { canonLessonWord } from '@/lib/wordTower/lessonSeed';
import { lessonTargetsFor, wordCraftLocaleFor } from '@/lib/word-craft/lessonBag';
import { planWorkshopOpener, WORKSHOP_DIMS } from '@/lib/education/workshopOpener';
import { claimWorkshopGuide } from '@/lib/education/workshopCoach';
import { wordCraftAttemptIsMeaningful } from '@/lib/education/wordcraftAssignment';
import { lessonWordHits, summarizeWorkshop, workshopStarsFor, type LessonWordHit } from '@/lib/education/workshopLessonBonus';
import { RIVAL_ART, rivalFinalMood, rivalReaction, workshopChestTier, type RivalMood, type Taunt } from '@/lib/education/academyReactions';
import type { Language } from '@/lib/supabase/education/types';
import { cn } from '@/lib/utils';
import {
  AcademyModeFrame,
  AcademyPlayerChip,
  ACADEMY_ART,
  useAcademyReducedMotion,
  usePreloadImages,
  primaryButtonClass,
  secondaryButtonClass,
  type AcademyPlayer,
} from './AcademyChrome';
import { AcademyReward } from './AcademyReward';
import { AcademyScene } from './AcademyScene';
import { WorkshopRival } from './WorkshopRival';
import { WorkshopWordsPanel, LessonWordTile } from './WorkshopPanels';
import { WorkshopVsIntro } from './WorkshopVsIntro';
import { GoldSparks, WorkshopBoardSkin, markNewGoldCells, placedCellKeys, useBuildableMarks } from './WorkshopSkin';

export interface WorkshopRecord {
  vocabularyWordsFound: string[];
  wordsFound: string[];
}

export interface WordWorkshopProps {
  lessonName: string;
  lessonWords: string[];
  lessonLanguage: Language;
  onBack: () => void;
  /** Opens the practice session; false = could not start. */
  startSession: () => Promise<boolean>;
  /** Records the finished round; resolves to server XP (null = not recorded). */
  recordResult: (r: WorkshopRecord) => Promise<number | null>;
  /** The signed-in student (avatar + name) — shown in the HUD and on the scoreboard. */
  player?: AcademyPlayer;
}

interface Done {
  lessonWordsFound: string[];
  wordsBuilt: number;
  stars: number;
  won: boolean;
  tie: boolean;
  meaningful: boolean;
}

type Phase = { name: 'intro' } | { name: 'playing'; seed: number; guide: boolean } | { name: 'done'; result: Done };

const newSeed = () => Math.floor(Math.random() * 1_000_000);

const RIVAL_REST_MS = 2600;
const CALLOUT_MS = 2200;

export default function WordWorkshop({ lessonName, lessonWords, lessonLanguage, onBack, startSession, recordResult, player }: WordWorkshopProps) {
  const { t, language: uiLanguage } = useLanguage();
  const sfx = useSoundEffects();
  const reduce = useAcademyReducedMotion();
  usePreloadImages(Object.values(RIVAL_ART));
  const [phase, setPhase] = useState<Phase>({ name: 'intro' });
  const [starting, setStarting] = useState(false);
  const [startFailed, setStartFailed] = useState(false);
  const [xp, setXp] = useState<number | null>(null);
  const [recordFailed, setRecordFailed] = useState(false);
  const [callout, setCallout] = useState<{ id: number; hit: LessonWordHit; total: number } | null>(null);
  const [rival, setRival] = useState<{ mood: RivalMood; taunt: Taunt | null }>({ mood: 'idle', taunt: null });
  const [found, setFound] = useState<Set<string>>(() => new Set());
  const [stars, setStars] = useState(0);
  const [sparks, setSparks] = useState<{ id: number; points: { x: number; y: number }[] } | null>(null);
  const starsRef = useRef(0);
  const calloutTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rivalTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gameRef = useRef<HTMLDivElement | null>(null);

  const lang = lessonLanguage as Parameters<typeof canonLessonWord>[1];
  const chips = useMemo(
    () => [...new Set(lessonWords.map((w) => canonLessonWord(w, lang)).filter(Boolean))],
    [lessonWords, lang],
  );
  const deal = useMemo(() => {
    const { locale, seeded } = wordCraftLocaleFor(lessonLanguage, uiLanguage ?? 'en');
    const targets = seeded ? lessonTargetsFor(lessonWords, locale) : [];
    const opener = planWorkshopOpener(targets, WORKSHOP_DIMS.size, locale);
    const onBoard = new Set(opener?.words ?? []);
    // The opener words are already on the board: stop steering refills toward them (unless that leaves nothing).
    const rest = targets.filter((w) => !onBoard.has(w));
    const gameTargets = rest.length > 0 ? rest : targets;
    return { locale, seeded, targets: gameTargets, opener: opener ? [...opener.tiles, ...opener.branch] : [] };
  }, [lessonWords, lessonLanguage, uiLanguage]);

  const openerKeys = useMemo(() => deal.opener.map((t) => `${t.row},${t.col}`), [deal.opener]);
  const latest = useRef({ lessonWords, lang, recordResult, sfx, openerKeys });
  useEffect(() => {
    latest.current = { lessonWords, lang, recordResult, sfx, openerKeys };
  });

  const { setGameActive } = sfx;
  useEffect(() => {
    setGameActive?.(true);
    return () => {
      setGameActive?.(false);
      if (calloutTimer.current) clearTimeout(calloutTimer.current);
      if (rivalTimer.current) clearTimeout(rivalTimer.current);
    };
  }, [setGameActive]);

  const playing = phase.name === 'playing';
  useBuildableMarks(gameRef, playing);
  useEffect(() => {
    if (!playing) return;
    starsRef.current = 0;
    setStars(0);
    setFound(new Set());
    setRival({ mood: 'idle', taunt: { key: 'academy.modes.workshop.rival.open', en: 'Your move, apprentice!' } });
    if (rivalTimer.current) clearTimeout(rivalTimer.current);
    rivalTimer.current = setTimeout(() => setRival({ mood: 'idle', taunt: null }), RIVAL_REST_MS);
    let ended = false;
    let moveIndex = 0;
    // The opener is on the board from the start — never gild it, even if the DOM is not mounted yet (dictionary still loading).
    const snapshot = () => new Set([...placedCellKeys(gameRef.current), ...latest.current.openerKeys]);
    let placedBefore = snapshot();
    const offMove = onWordCraftMove((move, { hotseat }) => {
      if (hotseat) return;
      const { lessonWords: words, lang: l, sfx: s } = latest.current;
      const hits = move.who === 'player' && move.words.length > 0 ? lessonWordHits(move.words, words, l) : [];
      const reaction = rivalReaction({ who: move.who, words: move.words, lessonHits: hits.length, moveIndex: moveIndex++ });
      setRival(reaction);
      if (rivalTimer.current) clearTimeout(rivalTimer.current);
      // On a lesson hit the bubble waits out the banner (it never shares the screen with it), then gets its full beat.
      rivalTimer.current = setTimeout(() => setRival({ mood: 'idle', taunt: null }), hits.length > 0 ? CALLOUT_MS + RIVAL_REST_MS : RIVAL_REST_MS);
      if (reaction.mood === 'attack') s.playOpponentScoredSound?.();
      if (hits.length === 0) {
        placedBefore = snapshot();
        return;
      }
      // Lesson word built: the tiles laid this move turn gold for the rest of the match.
      const points = markNewGoldCells(gameRef.current, placedBefore);
      placedBefore = snapshot();
      if (points.length > 0) setSparks({ id: Date.now(), points });
      starsRef.current += workshopStarsFor(hits);
      setStars(starsRef.current);
      setFound((prev) => new Set([...prev, ...hits.map((h) => h.lessonWord)]));
      const best = hits.find((h) => h.kind === 'exact') ?? hits[0];
      setCallout({ id: Date.now(), hit: best, total: starsRef.current });
      s.playPerfectWordSound?.();
      s.playBossHitSound?.();
      void s.playComboSound?.(Math.min(5, hits.length + 1));
      if (calloutTimer.current) clearTimeout(calloutTimer.current);
      calloutTimer.current = setTimeout(() => setCallout(null), CALLOUT_MS);
    });
    const offEnd = onWordCraftGameEnd((state, { hotseat }) => {
      if (ended || hotseat) return;
      ended = true;
      const { lessonWords: words, lang: l, recordResult: record, sfx: s } = latest.current;
      const summary = summarizeWorkshop(state.history, words, l);
      const wordsFound = [...new Set(state.history.filter((m) => m.who === 'player').flatMap((m) => m.words))];
      const result: Done = {
        lessonWordsFound: summary.lessonWordsFound,
        wordsBuilt: wordsFound.length,
        stars: summary.stars,
        won: state.player.score > state.bot.score,
        tie: state.player.score === state.bot.score,
        meaningful: wordCraftAttemptIsMeaningful({ lessonWordsFound: summary.lessonWordsFound, validWordsFound: wordsFound }),
      };
      setCallout(null);
      if (rivalTimer.current) clearTimeout(rivalTimer.current);
      setRival({ mood: rivalFinalMood(result), taunt: null });
      setXp(null);
      setRecordFailed(false);
      setPhase({ name: 'done', result });
      s.playQuestCompleteSound?.();
      const failed = () => {
        setRecordFailed(true);
        setXp(0);
      };
      void record({ vocabularyWordsFound: summary.lessonWordsFound, wordsFound }).then(
        (value) => (value === null ? failed() : setXp(value)),
        failed,
      );
    });
    return () => {
      offMove();
      offEnd();
    };
  }, [playing]);

  const title = t('academy.modes.workshop.title', 'Word Workshop');

  const play = async () => {
    if (starting) return;
    setStarting(true);
    setStartFailed(false);
    const ok = await startSession().catch(() => false);
    setStarting(false);
    if (!ok) {
      setStartFailed(true);
      return;
    }
    const storage = (() => {
      try {
        return typeof window === 'undefined' ? null : window.localStorage;
      } catch {
        return null;
      }
    })();
    setPhase({ name: 'playing', seed: newSeed(), guide: claimWorkshopGuide(storage) });
  };

  if (!deal.seeded) {
    return (
      <AcademyModeFrame title={title} onBack={onBack} accent="yellow" theme="workshop" testId="workshop-screen">
        <div data-testid="workshop-unsupported" className="flex w-full max-w-md flex-col items-center rounded-neo border-[3px] border-neo-cream bg-neo-navy-elevated p-6 text-center shadow-hard-lg">
          {/* eslint-disable-next-line @next/next/no-img-element -- static art */}
          <img src={ACADEMY_ART.wordcraft} alt="" className="mb-3 h-28 w-28 object-contain opacity-80 drop-shadow-[4px_4px_0_#000]" />
          <h2 className="mb-2 font-neo-display text-2xl font-black text-neo-white">
            {t('academy.modes.workshop.unsupportedTitle', 'The workshop is still learning this language')}
          </h2>
          <p className="mb-5 font-neo-body text-neo-cream/85">
            {t('academy.modes.workshop.unsupportedBody', "Word Workshop doesn't have letter tiles for this lesson's language yet. Try the lesson's other games!")}
          </p>
          <button type="button" data-testid="workshop-back" onClick={onBack} className={cn(primaryButtonClass, 'w-full')}>
            {t('academy.modes.backToAcademy', 'Back to Academy')}
          </button>
        </div>
      </AcademyModeFrame>
    );
  }

  const playerChip = player ? <AcademyPlayerChip player={player} className="max-w-[45%]" /> : null;

  if (phase.name === 'playing') {
    return (
      <div ref={gameRef} className="fixed inset-0 z-50 overflow-hidden bg-neo-navy [--wk-col:760px]" data-testid="workshop-game" data-academy-workshop="">
        <WorkshopBoardSkin reduce={reduce} />
        <AcademyScene theme="workshop" dim={0.62}>
          <WordCraftGameView
            seed={phase.seed}
            duel={null}
            hotseat={false}
            difficulty="easy"
            modifierOverride="none"
            lesson={{
              locale: deal.locale,
              targets: deal.targets,
              dims: WORKSHOP_DIMS,
              bare: true,
              initialTiles: deal.opener,
              guide: phase.guide,
              achievements: false,
              onExit: () => setPhase({ name: 'intro' }),
            }}
          />
        </AcademyScene>
        {/* The Baron: speech bubble under his scoreboard face below 2xl (a phone on its side: the free strip under the action bar), a full portrait hugging the board in the 2xl gutter.
            The bubble hides while the LESSON WORD banner shows, so the two never collide. */}
        <WorkshopRival
          mood={rival.mood}
          taunt={callout ? null : rival.taunt}
          size="game"
          bubbleSide="below"
          className="fixed end-3 top-[12.5rem] z-[60] items-end [@media(orientation:landscape)_and_(max-height:520px)]:top-auto [@media(orientation:landscape)_and_(max-height:520px)]:bottom-2 2xl:end-auto 2xl:start-[max(1rem,calc(50%-var(--wk-col)/2-17.5rem))] 2xl:top-1/2 2xl:-translate-y-1/2 2xl:items-center"
        />
        <div className="pointer-events-none fixed start-[calc(50%+var(--wk-col)/2+1.5rem)] top-1/2 z-[55] hidden w-[min(20rem,calc(50%-var(--wk-col)/2-2.5rem))] -translate-y-1/2 2xl:block">
          <WorkshopWordsPanel player={player} chips={chips} found={found} stars={stars} />
        </div>
        {sparks && !reduce && <GoldSparks key={sparks.id} burstId={sparks.id} points={sparks.points} />}
        <div className="pointer-events-none fixed inset-x-0 top-[18%] z-[60] flex justify-center px-4">
          <AnimatePresence>
            {callout && (
              <motion.div
                key={callout.id}
                data-testid="workshop-callout"
                role="status"
                initial={reduce ? false : { y: -30, scale: 0.5, rotate: -8 }}
                animate={{ y: 0, scale: 1, rotate: -2 }}
                exit={reduce ? undefined : { y: -20, scale: 0.8, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 520, damping: 16 }}
                className="flex items-center gap-2 rounded-neo border-[3px] border-black bg-neo-yellow px-4 py-2 font-neo-display text-black lg:px-6 lg:py-3"
                style={{ boxShadow: '5px 5px 0 #000, 0 0 32px rgba(255,214,0,0.75)' }}
              >
                <Star className="h-7 w-7 fill-current lg:h-10 lg:w-10" aria-hidden />
                <span className="flex flex-col leading-tight">
                  <span className="text-xs font-bold uppercase tracking-widest lg:text-base">
                    {callout.hit.kind === 'exact'
                      ? t('academy.modes.workshop.lessonWord', 'Lesson word!')
                      : t('academy.modes.workshop.hiddenLessonWord', 'Hidden lesson word!')}
                  </span>
                  <span translate="no" className="text-2xl font-black lg:text-4xl">{callout.hit.lessonWord}</span>
                </span>
                <span className="ms-1 rounded-full border-2 border-black bg-black px-2 py-0.5 text-sm font-black text-neo-yellow lg:text-xl">
                  {t('academy.modes.workshop.stars', '★ {count}', { count: callout.total })}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    );
  }

  if (phase.name === 'done') {
    const r = phase.result;
    const verdict = r.won
      ? t('academy.modes.workshop.wonBaron', 'You beat the Baron!')
      : r.tie
        ? t('academy.modes.workshop.tie', 'A tie!')
        : t('academy.modes.workshop.lostBaron', 'The Baron won this one');
    const actions = (
      <>
        <button type="button" data-testid="workshop-again" onClick={() => void play()} className={cn(primaryButtonClass, 'flex-1 whitespace-nowrap px-3 text-base sm:text-xl')}>
          <RotateCcw className="h-5 w-5 lg:h-8 lg:w-8" aria-hidden />
          {t('academy.modes.playAgain', 'Play again')}
        </button>
        <button type="button" data-testid="workshop-back" onClick={onBack} className={cn(secondaryButtonClass, 'flex-1 px-3 text-sm sm:text-base')}>
          {t('academy.modes.backToAcademy', 'Back to Academy')}
        </button>
      </>
    );
    const rivalArt = (
      <WorkshopRival
        mood={rival.mood}
        taunt={null}
        className="absolute bottom-[8%] start-0 origin-bottom-left scale-[0.55] sm:scale-75 lg:bottom-[6%] lg:scale-90"
      />
    );
    return (
      <AcademyModeFrame title={title} onBack={onBack} accent="yellow" theme="workshop" testId="workshop-screen" right={playerChip}>
        <div data-testid="workshop-results" className="flex h-full min-h-0 w-full flex-col items-center justify-center">
          {r.meaningful ? (
            <AcademyReward
              tier={workshopChestTier({ won: r.won, lessonWords: r.lessonWordsFound.length })}
              headline={verdict}
              chestLabel={t('academy.modes.workshop.chest', 'Workshop chest')}
              xp={recordFailed ? 0 : xp}
              aside={rivalArt}
              note={
                <>
                  {r.lessonWordsFound.length > 0 && (
                    <ul className="flex max-h-9 flex-wrap justify-center gap-1.5 overflow-hidden lg:max-h-24 lg:justify-start lg:gap-2" translate="no">
                      {r.lessonWordsFound.map((w) => (
                        <LessonWordTile key={w} word={w} found />
                      ))}
                    </ul>
                  )}
                  {recordFailed && (
                    <p data-testid="workshop-xp-not-saved" className="font-neo-body text-xs text-neo-pink lg:text-lg">
                      {t('academy.modes.xpNotSaved', "Couldn't save XP this time. Play again to try once more.")}
                    </p>
                  )}
                </>
              }
              stats={[
                { icon: <Coins />, value: String(r.lessonWordsFound.length), label: t('academy.modes.workshop.statLessonWords', 'Lesson words') },
                // The star lives in the medallion icon, so the trophy number is just the count.
                { icon: <Star className="fill-current" />, value: String(r.stars), label: t('academy.modes.workshop.statStars', 'Stars') },
                { icon: <Hammer />, value: String(r.wordsBuilt), label: t('academy.modes.workshop.statWords', 'Words built') },
              ]}
              actions={actions}
            />
          ) : (
            <div className="relative flex h-full w-full max-w-md flex-col items-center justify-center gap-4 text-center lg:max-w-3xl">
              <WorkshopRival mood={rival.mood} taunt={{ key: 'academy.modes.workshop.rival.gloat', en: 'My workshop, my rules!' }} bubbleSide="below" />
              <h2 className="font-neo-display text-3xl font-black uppercase text-neo-white lg:text-7xl" style={{ textShadow: '3px 3px 0 #000' }}>{verdict}</h2>
              <p data-testid="workshop-nudge" className="font-neo-body text-base text-neo-cream lg:text-2xl">
                {t('academy.modes.workshop.nudge', 'Build at least one lesson word (or 3 words) to earn the chest. You got this!')}
              </p>
              <div className="flex w-full gap-2 lg:gap-4">{actions}</div>
            </div>
          )}
        </div>
      </AcademyModeFrame>
    );
  }

  return (
    <AcademyModeFrame title={title} onBack={onBack} accent="yellow" theme="workshop" testId="workshop-screen">
      <WorkshopVsIntro lessonName={lessonName} chips={chips} player={player} starting={starting} startFailed={startFailed} onPlay={() => void play()} />
    </AcademyModeFrame>
  );
}
