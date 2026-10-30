'use client';

import React, { useEffect, useState } from 'react';
import { m } from 'framer-motion';
import { Sparkles, Gem } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCrazyGames } from '@/components/CrazyGamesSDK';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { cn } from '@/lib/utils';
import { SPRING_PRESETS } from '@/lib/animation/presets';
import { scoreWord } from '@/utils/dailyChallenge/wordWheelScoring';
import { selectRareFindCelebration, type RareFind } from '@/lib/wordWheel/wordRarity';
import { applyHebrewFinalLetters } from '@/shared/utils/wordNormalization';
import { trackGrowthEvent } from '@/utils/growthTracking';
import { usePracticeFlag } from '@/hooks/usePracticeFlag';
import PracticeChainCta from '@/components/practice/PracticeChainCta';
import DailyInsightStack from './DailyInsightStack';
import { DailyResultsHero } from './results/DailyResultsHero';
import WheelRankMeter from './wheel/WheelRankMeter';
import WheelShareRow from './wheel/WheelShareRow';
import { WHEEL_RANKS, rankProgress, wheelRankLadder } from '@/lib/wordWheel/rankLadder';
import TabbedDailyLeaderboard from './TabbedDailyLeaderboard';
import { useIsGuest } from '@/hooks/useIsGuest';
import WordWheelSignupCta from './WordWheelSignupCta';
import WordWheelReplayCta from './WordWheelReplayCta';
import CatchUpSuggestion from './CatchUpSuggestion';
import { STICKY_CTA_WORD_WHEEL } from './stickyCta';
import { NextQuestCta } from './results/NextQuestCta';
import { GuestNameEditor } from './results/GuestNameEditor';
import { getGuestDailyPlayer } from '@/utils/dailyChallenge/guestPlayer';
import CollapsibleSection from '@/components/ui/CollapsibleSection';
import MpModeCrossPromo from './MpModeCrossPromo';
import { wasSignupModalDismissedRecently } from '@/utils/dailyChallenge';
import type { Language } from '@/types';
import type { WordWheelGameResult } from './WordWheelGame';
import WheelScoreBreakdown from './wheel/WheelScoreBreakdown';
import { reachesWizardRank } from './wheel/wheelWizard';


interface WordWheelResultsProps {
  result: WordWheelGameResult;
  puzzleNumber: number;
  puzzleDate: string;
  language: Language;
  hasPlayedWordHunt: boolean;
  currentPlayerId?: string | null;
  currentGuestFingerprint?: string | null;
  /**
   * Bumped by the parent once the submit POST lands. Used as the leaderboard's
   * `key` so it remounts and refetches — the first mount races the write and
   * would otherwise show a board without this player.
   */
  leaderboardKey?: number;
  /** Whether the viewer is signed in. Gates the guest signup CTA. */
  isAuthenticated?: boolean;
  /** Current daily-streak length (getDailyStreak().currentStreak) — feeds the signup hook. */
  streakDays?: number;
  /** True on the player's first-ever daily completion (welcome framing). */
  isFirstCompletion?: boolean;
  /** True when this is the terminal 'already-played' view (returning player) — enables the practice CTA. */
  alreadyPlayed?: boolean;
  /** True when this was a catch-up play (past day) — shows catch-up suggestion. */
  isCatchup?: boolean;
  /** Practice only: starts a fresh practice wheel (new random puzzle). When
   *  absent the button is hidden — old callers stay valid. */
  onPracticeAgain?: () => void;
}

const WordWheelResults: React.FC<WordWheelResultsProps> = ({
  result, puzzleNumber, puzzleDate, language: gameLang, hasPlayedWordHunt,
  currentPlayerId, currentGuestFingerprint, leaderboardKey = 0,
  isAuthenticated = false, streakDays = 0, isFirstCompletion = false, alreadyPlayed = false,
  isCatchup = false, onPracticeAgain,
}) => {
  const { t, language } = useLanguage();
  const { submitLeaderboardScore } = useCrazyGames();
  const { playSound } = useSoundEffects();
  const isPractice = usePracticeFlag();
  const isExceptional = reachesWizardRank(result.score, puzzleDate, gameLang);
  const ladder = wheelRankLadder({ puzzleDate, language: gameLang });
  const celebrate = !alreadyPlayed;
  const formatWord = (w: string) => (gameLang === 'he' ? applyHebrewFinalLetters(w) : w);
  const longest = result.wordsFound.reduce((best, w) => (w.length > best.length ? w : best), '');
  const [rareFind, setRareFind] = useState<RareFind | null>(null);
  // Live rank + field size for today, reported up by the leaderboard below.
  // Feeds the rank-aware guest signup hook ("you're #1 today"). The same board
  // already lists this player (by id or guest fingerprint), so this is just
  // surfacing the position they can see right beneath the CTA.
  const [currentRank, setCurrentRank] = useState<number | null>(null);
  const [totalPlayers, setTotalPlayers] = useState(0);

  // Resolution-aware: gating on the `isAuthenticated` prop alone would flash the
  // stripped layout at a logged-in player on first paint (rules/60 Class 1).
  const isGuest = useIsGuest(isAuthenticated);
  const [guestName, setGuestName] = useState<string | null>(null);
  const [renameCount, setRenameCount] = useState(0);
  useEffect(() => {
    if (isGuest) void getGuestDailyPlayer().then(p => setGuestName(p.displayName));
  }, [isGuest]);

  // Funnel anchor: fire once on mount so PostHog can measure results-page drop-off
  useEffect(() => {
    trackGrowthEvent('results_viewed', { mode: 'word-wheel', score: result.score });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Rarest-find celebration: pull the day's distinct-player count per word and
  // surface the player's rarest find ("only you found X — so far" / "rare find").
  // Skipped in practice (no shared field to compare against). Best-effort: any
  // fetch/parse failure simply yields no card.
  useEffect(() => {
    if (isPractice || result.wordsFound.length === 0) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/daily-challenge/word-wheel/word-rarity/${puzzleDate}/${gameLang}`);
        if (!res.ok) return;
        const json = await res.json();
        const counts = (json?.counts ?? {}) as Record<string, number>;
        const find = selectRareFindCelebration(result.wordsFound, counts);
        if (!cancelled && find) setRareFind(find);
      } catch { /* rarity is best-effort */ }
    })();
    return () => { cancelled = true; };
  }, [isPractice, result.wordsFound, puzzleDate, gameLang]);

  // Submit completion score to CrazyGames leaderboard (no-op off-platform).
  // Drives CG retention metrics by tying daily-challenge engagement to the
  // platform leaderboard the player can return to.
  useEffect(() => {
    if (result.score > 0) {
      submitLeaderboardScore(result.score);
    }
  }, [result.score, submitLeaderboardScore]);

  // Layered celebration for exceptional runs — partyTada lands ~700ms after
  // the existing victoryFanfare from WordWheelGame so they sequence, not stack.
  // crownVictory follows another ~500ms later to cap the moment.
  useEffect(() => {
    if (!isExceptional || isPractice) return;
    const t1 = setTimeout(() => playSound('partyTada', { volume: 0.7, requiresGameActive: false }), 700);
    const t2 = setTimeout(() => playSound('crownVictory', { volume: 0.6, requiresGameActive: false }), 1200);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [isExceptional, isPractice, playSound]);

  return (
    <m.div
      /* No `overflow-hidden` here: an overflow-hidden ancestor becomes the
         scrollport for `position: sticky` and would silently pin the CTA to nothing. */
      className="relative flex flex-col items-center gap-3 w-full max-w-md mx-auto px-4 py-5 lg:max-w-5xl lg:flex-row lg:items-start lg:gap-8"
    >
      <div className="w-full flex flex-col items-center gap-3">
        <DailyResultsHero
          mode="word-wheel"
          outcome={result.wordsFound.length > 0 ? 'win' : 'done'}
          headline={t(`wordWheel.rank.${WHEEL_RANKS[rankProgress(result.score, ladder).index]}`)}
          eyebrow={`#${puzzleNumber}`}
          score={result.score}
          stats={[
            { value: result.wordsFound.length, label: t('wordWheel.results.wordsFound') },
            { value: longest ? formatWord(longest) : '-', label: t('wordWheel.strip.longest') },
          ]}
          meter={<WheelRankMeter t={t} score={result.score} animate={celebrate} puzzleDate={puzzleDate} language={gameLang} />}
          celebrate={celebrate}
          className="z-10"
        >
          {result.wordsFound.length > 0 && (
            <WheelShareRow
              t={t}
              score={result.score}
              wordsFound={result.wordsFound}
              puzzleNumber={puzzleNumber}
              onShareClick={(method) => trackGrowthEvent('cross_promo_click', {
                target: 'share',
                source: 'word_wheel_results',
                placement: 'results_hero',
                method,
                language,
              })}
            />
          )}
        </DailyResultsHero>

        {result.breakdown && <WheelScoreBreakdown t={t} breakdown={result.breakdown} coins={isAuthenticated ? result.coins ?? 0 : 0} />}

        {(isExceptional || rareFind) && (
          <div data-testid="results-highlights" className="z-10 flex flex-wrap items-center justify-center gap-2">
            {isExceptional && (
              <m.span
                data-testid="word-wheel-perfect-banner"
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border-2 border-neo-black bg-neo-lime text-neo-black font-neo-display font-black text-xs uppercase tracking-wider shadow-hard-sm"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ ...SPRING_PRESETS.bouncy, delay: 1.0 }}
              >
                <Sparkles className="w-3.5 h-3.5" strokeWidth={2.5} aria-hidden />
                {t('wordWheel.results.perfectBanner', 'Word Wizard!')}
              </m.span>
            )}
            {rareFind && (
              <m.span
                data-testid="word-wheel-rare-find"
                data-exclusive={rareFind.isExclusive ? 'true' : 'false'}
                className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-1 rounded-full border-2 border-neo-black text-xs font-black shadow-hard-sm',
                  rareFind.isExclusive ? 'bg-neo-yellow text-neo-black' : 'bg-neo-purple text-neo-white',
                )}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ ...SPRING_PRESETS.bouncy, delay: 1.1 }}
              >
                <Gem className="w-3.5 h-3.5 shrink-0" strokeWidth={2.5} aria-hidden />
                <span className="uppercase tracking-wide">
                  {rareFind.isExclusive
                    ? t('wordWheel.results.onlyYouFound', 'Only you found this — so far!')
                    : t('wordWheel.results.rareFind', { count: rareFind.playerCount })}
                </span>
                <span dir="auto" className="font-neo-display tracking-widest">{formatWord(rareFind.word)}</span>
              </m.span>
            )}
          </div>
        )}

        {/* Guest signup conversion — Word Wheel bypasses the generic guest-stats
            signup gate, so this restores a value-led signup surface for the mode.
            Experiment-gated (wheel-signup-offer-v1); framing via selectWheelSignupOffer. */}
        {!isPractice && (
          <WordWheelSignupCta
            isAuthenticated={isAuthenticated}
            isPractice={isPractice}
            streakDays={streakDays}
            isFirstCompletion={isFirstCompletion}
            dismissedRecently={wasSignupModalDismissedRecently()}
            score={result.score}
            rank={currentRank}
            totalPlayers={totalPlayers}
          />
        )}

        {/* Practice mode: replace cross-promos + leaderboard with chain CTA so the
            player flows from one practice mode to the next without dead-ends. */}
        {isPractice && (
          <m.div
            className="w-full z-10"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, type: 'spring', stiffness: 300, damping: 26 }}
          >
            {/* Primary next action: another wheel, right now. Without this the
                chain CTA (wheelRush = last mode → hub link) is a dead-end for a
                player who wants to keep spinning. */}
            {onPracticeAgain && (
              <button
                type="button"
                data-testid="wheel-practice-again"
                onClick={onPracticeAgain}
                className="w-full mb-2 py-3 rounded-neo border-3 border-neo-black bg-neo-purple text-neo-white font-neo-display font-black text-base shadow-hard active:shadow-hard-pressed active:translate-x-[1px] active:translate-y-[1px]"
              >
                {t('wordWheel.practice.again')}
              </button>
            )}
            <PracticeChainCta currentMode="wheelRush" />
          </m.div>
        )}

        {/* ONE next step for the whole daily, for every mode.
            This was three hand-rolled sticky CTAs chained by hand — Connections,
            then Word Hunt, then "back to the hub" — which never mentioned Word
            Tower at all, so a player who had finished the other three was told the
            day was over with a mode still unplayed. NextQuestCta reads the same
            server-backed play state the hub does and offers whatever is actually
            next, keeping the `cross_promo_click` event these emitted.

            The original rule was "no CTA for a guest", but its stated reason was
            specifically that this slot is PINNED and a guest's signup card already
            lives there. So the rule is kept where it applies — a guest gets the
            handoff in normal flow instead of pinned, so it cannot ride over the
            signup card. Dropping it entirely would dead-end ~90% of players on a
            screen whose whole job is "what next", and would leave Word Wheel
            behaving differently from Word Hunt for the same player (rules/60
            Class 3). */}
        {!isPractice && (
          <NextQuestCta
            justFinished="word-wheel"
            currentLanguage={language}
            source={isGuest ? 'word_wheel_results_guest' : 'word_wheel_results'}
            className={isGuest ? 'w-full' : STICKY_CTA_WORD_WHEEL}
          />
        )}

      </div>

      <div className="w-full flex flex-col items-center gap-3">
        {/* Leaderboard — hidden in practice (no score persisted, would only confuse). */}
        {!isPractice && (
          <m.div
            className="w-full z-10"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
          >
            {isGuest && guestName && (
              <GuestNameEditor
                name={guestName}
                guestFingerprint={currentGuestFingerprint ?? null}
                onRenamed={(name) => {
                  setGuestName(name);
                  setRenameCount(c => c + 1);
                }}
                t={t}
              />
            )}
            <TabbedDailyLeaderboard
              key={`${leaderboardKey}-${renameCount}`}
              puzzleDate={puzzleDate}
              language={gameLang}
              currentPlayerId={currentPlayerId}
              currentGuestFingerprint={currentGuestFingerprint}
              scope="word-wheel"
              defaultTab="today"
              t={t}
              maxVisible={5}
              compact
              myWheelWordsFound={result.wordsFound}
              onCurrentUserRankChange={setCurrentRank}
              onParticipantCountChange={setTotalPlayers}
            />
            {result.wordsFound.length > 0 && (
              <p className="mt-2 text-xs text-neo-white/70 text-center font-medium">
                {t('wordWheel.results.tapPlayerHint', 'Tap a player to see what you missed')}
              </p>
            )}
          </m.div>
        )}

        {/* Everything past the verdict, the next-step CTA and the leaderboard is
            recap: useful, but not what the player came back for. It stays one tap
            away instead of being cut, so no behaviour — and no analytics event —
            is lost. Impression events inside now fire when the recap is OPENED,
            which is a truer impression than firing on mount while off-screen. */}
        {/* Catch-up dailies — a missed daily is another GAME, not a detail about
            this one, so it stays outside the disclosure (it renders nothing when
            there is nothing to catch up). Mirrors the Word Hunt results screen. */}
        {!isPractice && !isGuest && (
          <div className="w-full z-10">
            <CatchUpSuggestion mode="word-wheel" excludeDate={puzzleDate} />
          </div>
        )}

        {!isPractice && !isGuest && (
          <CollapsibleSection
            title={t('daily.results.fullRecap', 'Full recap')}
            summary={t('daily.results.fullRecapSummary', 'Your rank, your rarest word, your coins — and who you beat')}
            className="w-full z-10"
          >
            <div className="flex flex-col gap-3">
              <DailyInsightStack mode="word_wheel" date={puzzleDate} />

              {/* Returning-player anti-bounce: an engaged returner gets an instant
                  next game instead of a dead end. Experiment-gated. */}
              {alreadyPlayed && <WordWheelReplayCta />}

              {/* Only once today's pair is done, so it never competes with the
                  "finish today's challenge" daily<->daily CTA above. */}
              {hasPlayedWordHunt && (
                <MpModeCrossPromo language={language} source="word_wheel_results" t={t} />
              )}

              {result.wordsFound.length > 0 && (
                <div>
                  <h3 className="text-neo-white text-xs font-bold uppercase mb-2">
                    {t('wordWheel.foundWords')}
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {result.wordsFound.map((word) => (
                      <span
                        key={word}
                        className="px-2 py-0.5 rounded-neo border-2 border-neo-black bg-neo-navy-light text-neo-white text-xs font-semibold shadow-hard-xs"
                      >
                        {formatWord(word)}{' '}
                        <span className="text-neo-lime">+{scoreWord(word)}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CollapsibleSection>
        )}

      </div>
    </m.div>
  );
};

export default WordWheelResults;
