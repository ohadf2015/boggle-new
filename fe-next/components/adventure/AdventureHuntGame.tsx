'use client';

import React, { useCallback, useMemo, useReducer } from 'react';
import { X, Loader2 } from 'lucide-react';
import { useLanguageSafe } from '@/contexts/LanguageContext';
import { useProgressionActions, useProgressionData } from '@/contexts/ProgressionContext';
import { useUpgradeEffects } from '@/hooks/useUpgradeEffects';
import { useAdventureMusic } from '@/hooks/useAdventureMusic';
import { useChapterQuests } from '@/hooks/useChapterQuests';
import { getChapterNumber } from '@/lib/adventure/questConfig';
import { useAdventureAchievements } from '@/hooks/useAdventureAchievements';
import { showAchievementToast } from '@/components/achievements/AchievementToast';
import { ADVENTURE_ACHIEVEMENTS } from '@/utils/adventureAchievementUtils';
import { useAdventureWordValidation } from '@/hooks/useAdventureWordValidation';
import { WordHuntGameLayout } from '@/components/wordhunt/WordHuntGameLayout';
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog';
import { pickHuntTarget, HUNT_WRONG_GUESS_DAMAGE, HUNT_MAX_ATTEMPTS, getHuntLifePoints } from '@/lib/adventure/huntMode';
import { getLetterFeedback } from '@/utils/wordHuntFeedback';
import { cn } from '@/lib/utils';
import type { LevelConfig } from '@/types/adventure';
import type { TargetAttempt } from '@/components/daily/survival/types';

interface Props {
  levelConfig: LevelConfig;
  initialGrid: string[][];
  onLevelComplete: (stars: number, score: number, wordsFound: number, goldEarned: number) => void;
  onExit: () => void;
}

// ─── Local state ─────────────────────────────────────────────────

interface HuntState {
  targetWord: string | null;
  hp: number;
  attempts: TargetAttempt[];
  foundWords: string[];
  targetFound: boolean;
  isGameOver: boolean;
}

type HuntAction =
  | { type: 'SET_TARGET'; word: string }
  | { type: 'SUBMIT_WORD'; word: string }

function huntReducer(state: HuntState, action: HuntAction): HuntState {
  if (action.type === 'SET_TARGET') {
    return { ...state, targetWord: action.word.toUpperCase(), attempts: [], targetFound: false, isGameOver: false };
  }

  if (action.type === 'SUBMIT_WORD') {
    const word = action.word.toUpperCase();
    const target = state.targetWord;

    const alreadyFound = state.foundWords.includes(word);
    const newFoundWords = alreadyFound ? state.foundWords : [...state.foundWords, word];

    if (!target) return { ...state, foundWords: newFoundWords };

    // Different-length words are "discovery" guesses (no HP damage)
    if (word.length !== target.length) {
      const feedback = getLetterFeedback(word, target);
      const attempt: TargetAttempt = { word, feedback, timestamp: Date.now(), isDiscovery: true };
      return { ...state, foundWords: newFoundWords, attempts: [...state.attempts, attempt] };
    }

    const feedback = getLetterFeedback(word, target);
    const attempt: TargetAttempt = { word, feedback, timestamp: Date.now() };
    const newAttempts = [...state.attempts, attempt];

    if (word === target) {
      return { ...state, foundWords: newFoundWords, attempts: newAttempts, targetFound: true, isGameOver: true };
    }

    const newHp = Math.max(0, state.hp - HUNT_WRONG_GUESS_DAMAGE);
    const nonDiscoveryCount = newAttempts.filter(a => !a.isDiscovery).length;
    const maxedOut = HUNT_MAX_ATTEMPTS > 0 && nonDiscoveryCount >= HUNT_MAX_ATTEMPTS;
    const dead = newHp <= 0 || maxedOut;
    return { ...state, foundWords: newFoundWords, attempts: newAttempts, hp: newHp, isGameOver: dead };
  }

  return state;
}

// ─── Component ───────────────────────────────────────────────────

const AdventureHuntGame: React.FC<Props> = ({ levelConfig, initialGrid, onLevelComplete, onExit }) => {
  const { t, language, dir } = useLanguageSafe();
  const { completeLevel } = useProgressionActions();
  const { progression } = useProgressionData();
  const upgradeEffects = useUpgradeEffects(progression?.upgrades ?? {});
  const chapterQuests = useChapterQuests({
    worldId: levelConfig.world,
    chapterNumber: getChapterNumber(levelConfig.level),
  });
  const { earnAchievement, getCount } = useAdventureAchievements();
  const handleEarnAchievement = useCallback((id: keyof typeof ADVENTURE_ACHIEVEMENTS) => {
    const isNew = earnAchievement(id);
    if (isNew) {
      const count = getCount(id) + 1;
      showAchievementToast({ achievement: ADVENTURE_ACHIEVEMENTS[id], count, isNew: count === 1 });
    }
    return isNew;
  }, [earnAchievement, getCount]);

  useAdventureMusic({
    worldNumber: levelConfig.world,
    isPlaying: true,
    isPaused: false,
    timeRemaining: 120,
    totalTime: 120,
    enabled: true,
    isBossLevel: false,
  });

  const grid = initialGrid;
  const initialHp = levelConfig.lifePoints ?? getHuntLifePoints(levelConfig.world);
  const [state, dispatch] = useReducer(huntReducer, {
    targetWord: levelConfig.hiddenWord?.toUpperCase() ?? null,
    hp: initialHp,
    attempts: [],
    foundWords: [],
    targetFound: false,
    isGameOver: false,
  });

  const { solvedWords, isSolveGridLoading } = useAdventureWordValidation({
    grid,
    language,
    minWordLength: levelConfig.minWordLength ?? 3,
    foundWords: state.foundWords,
  });

  // Pick target from solved set when available (skip if hiddenWord already set).
  // If solve-grid finished but yielded no target, surface an error instead of
  // spinning forever — empty Set is truthy, so `!solvedWords` is not enough.
  const targetPickedRef = React.useRef(false);
  const [noTargetAvailable, setNoTargetAvailable] = React.useState(false);
  React.useEffect(() => {
    if (state.targetWord || targetPickedRef.current) return;
    if (isSolveGridLoading) return;
    if (!solvedWords) {
      // Query errored out after retries — no data at all
      setNoTargetAvailable(true);
      return;
    }
    const target = pickHuntTarget(solvedWords);
    if (target) {
      targetPickedRef.current = true;
      dispatch({ type: 'SET_TARGET', word: target });
    } else {
      setNoTargetAvailable(true);
    }
  }, [solvedWords, isSolveGridLoading, state.targetWord]);

  const targetWord = state.targetWord;
  const targetLength = targetWord?.length ?? 0;

  // Quit confirmation. Tapping exit mid-match used to call onExit directly,
  // which fires window.history.back() and tears the live scene down with no
  // gate — an accidental tap blanked the Capacitor WebView ("black screen on
  // exit"). Gate it behind a confirmation like classic AdventureGame and every
  // other Word Hunt surface (MP, daily Survival). Skip the prompt once the game
  // is over (nothing left to lose) so the post-game exit stays one tap.
  const [showExitConfirm, setShowExitConfirm] = React.useState(false);
  const handleRequestExit = useCallback(() => {
    if (state.isGameOver) { onExit(); return; }
    setShowExitConfirm(true);
  }, [state.isGameOver, onExit]);
  const handleConfirmExit = useCallback(() => {
    setShowExitConfirm(false);
    onExit();
  }, [onExit]);

  const completedRef = React.useRef(false);
  React.useEffect(() => {
    if (!state.targetFound || completedRef.current) return;
    completedRef.current = true;
    const score = (targetLength * 100) + state.foundWords.length * 10;
    const stars = 3;
    const longWords = state.foundWords.filter(w => w.length >= 6).length;
    const baseGold = Math.floor(score / 10) + stars * 5;
    const longWordBonus = upgradeEffects.longWordGoldBonus * longWords;
    const gold = Math.floor(baseGold * upgradeEffects.goldMultiplier) + longWordBonus;
    void completeLevel(levelConfig.world, levelConfig.level, stars, score, state.foundWords.length, gold, longWords, state.foundWords);
    chapterQuests.recordWordsFound(state.foundWords.length);
    chapterQuests.recordScoreChallenge(score);
    chapterQuests.recordLevelPerfect();
    for (let i = 0; i < longWords; i++) chapterQuests.recordLongWord();
    if (state.foundWords.length > 0) handleEarnAchievement('FIRST_WORD');
    if (state.foundWords.some(w => w.length >= 6)) handleEarnAchievement('LONG_WORD_6');
    if (state.foundWords.some(w => w.length >= 8)) handleEarnAchievement('LONG_WORD_8');
    handleEarnAchievement('PERFECT_LEVEL');
    const newTotalStars = (progression?.totalStars ?? 0) + stars;
    if (newTotalStars >= 50) handleEarnAchievement('STAR_COLLECTOR_50');
    if (newTotalStars >= 100) handleEarnAchievement('STAR_COLLECTOR_100');
    onLevelComplete(stars, score, state.foundWords.length, gold);
  }, [state.targetFound, targetLength, state.foundWords, completeLevel, levelConfig.world, levelConfig.level,
      upgradeEffects.goldMultiplier, upgradeEffects.longWordGoldBonus, chapterQuests,
      handleEarnAchievement, progression?.totalStars, onLevelComplete]);

  // Game over without finding target → 0 stars
  React.useEffect(() => {
    if (!state.isGameOver || state.targetFound || completedRef.current) return;
    completedRef.current = true;
    onLevelComplete(0, 0, state.foundWords.length, 0);
  }, [state.isGameOver, state.targetFound, state.foundWords.length, onLevelComplete]);

  const handleWordSubmit = useCallback((word: string) => {
    if (!solvedWords || !solvedWords.has(word.toLowerCase())) return;
    dispatch({ type: 'SUBMIT_WORD', word });
  }, [solvedWords]);

  const attemptsForLayout = state.attempts;
  const username = 'player';
  const leaderboard = useMemo(() => [{ username, score: state.foundWords.length * 10 }], [state.foundWords.length]);
  const playerLives = useMemo(() => ({ [username]: state.hp }), [state.hp]);
  const emptyMap = useMemo(() => new Map<number, never>(), []);
  const emptySet = useMemo(() => new Set<string>(), []);

  // Show loading state while waiting for grid solve + target pick
  const isLoading = !state.targetWord && !noTargetAvailable;

  return (
    <div className="relative h-full w-full bg-neo-navy flex flex-col">
      {/* Exit button */}
      <button
        onClick={handleRequestExit}
        aria-label={t('common.exit')}
        className={cn(
          'absolute top-2 start-2 z-20 p-2 rounded-neo',
          'bg-neo-white/8 text-neo-white hover:bg-neo-red/20 hover:text-neo-red',
          'transition-colors duration-200'
        )}
      >
        <X className="w-5 h-5" />
      </button>

      {/* Level badge */}
      <div className="absolute top-2 end-2 z-20 px-3 py-1 rounded-neo bg-neo-cyan/20 border-2 border-neo-cyan/40">
        <span className="text-[11px] font-mono font-bold text-neo-white tabular-nums">
          W{levelConfig.world}·L{levelConfig.level}
        </span>
      </div>

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center gap-3 text-neo-white">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span className="font-neo-body text-sm">{t('adventure.hunt.preparingPuzzle')}</span>
        </div>
      ) : noTargetAvailable ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6 text-center">
          <span className="font-neo-display text-lg text-neo-white">
            {t('adventure.hunt.noTargetAvailable')}
          </span>
          <button
            onClick={onExit}
            className="px-5 py-2 rounded-neo border-neo bg-neo-cyan text-neo-navy font-neo-display shadow-hard"
          >
            {t('common.exit')}
          </button>
        </div>
      ) : (
        <div className="flex-1 min-h-0 relative overflow-hidden">
          <WordHuntGameLayout
            // Header
            score={state.foundWords.length * 10}
            onQuit={handleRequestExit}

            // Clue boxes
            targetLength={targetLength}
            currentHint={null}
            attempts={attemptsForLayout}
            accumulatedClues={emptyMap}
            knownLetters={emptySet}
            latestAttemptFeedback={attemptsForLayout.length > 0 ? attemptsForLayout[attemptsForLayout.length - 1].feedback : null}
            showFeedbackOverlay={false}

            // Life bar
            lifePoints={state.hp}
            isGameOver={state.isGameOver}
            targetFound={state.targetFound}
            isLifeGaining={false}
            lifeGainAmount={null}
            isClueGaining={false}

            // Grid
            grid={grid}
            onWordSubmit={handleWordSubmit}
            onWordChange={() => {}}

            // Leaderboard (SP stubs)
            playerLives={playerLives}
            eliminatedPlayers={[]}
            leaderboard={leaderboard}
            currentUsername={username}

            // Suppress MP game-over overlay — adventure handles completion itself
            hideGameOverOverlay

            // Common
            t={t}
            gameDir={dir}
          />
        </div>
      )}

      {/* Quit confirmation — prevents accidental mid-match teardown / black screen */}
      <ConfirmationDialog
        open={showExitConfirm}
        onOpenChange={setShowExitConfirm}
        title={t('adventure.game.confirmExit')}
        description={t('adventure.game.confirmExitDesc')}
        confirmText={t('common.quit')}
        cancelText={t('common.cancel')}
        onConfirm={handleConfirmExit}
        variant="danger"
        analyticsId="adventure_hunt_quit_confirm"
      />
    </div>
  );
};

export default AdventureHuntGame;
