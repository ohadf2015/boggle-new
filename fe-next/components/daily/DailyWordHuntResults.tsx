'use client';

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Share2, Trophy, X, ArrowLeft, Copy, Check, Send, Coins, RotateCcw, ImageDown, ChevronDown, Eye, BarChart3, Timer, Sparkles } from 'lucide-react';
import { MobileTabBar } from '@/components/layout/MobileTabBar';

// X/Twitter icon (no lucide equivalent)
const XTwitterIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" width="1em" height="1em">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
);

// WhatsApp icon (official brand icon)
const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" width="1em" height="1em">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);
import { Button } from '@/components/ui/button';
import { fireConfetti, fireRankConfetti, fireVictoryConfetti } from '@/utils/confettiUtils';
import { cn } from '@/lib/utils';
import { useScreenshotProtection } from '@/hooks/useScreenshotProtection';
import {
  generateWordHuntShareableResult,
  getGuestFingerprint,
  getGuestDailyPlayer,
  getStreakMilestone,
  getStreakMilestoneMessage,
  findRarestWord,
  hasPlayedWordHuntToday,
  getConversionTrigger,
  recordSignupModalDismissed,
  getTodaysWordHuntResult,
  markWordHuntResultSubmitted,
  type WordHuntResult,
  type GuestDailyPlayer,
  type ConversionTrigger,
} from '@/utils/dailyChallenge';
import DailyChallengeSignupModal from '@/components/auth/DailyChallengeSignupModal';
import DailyChallengeInlineSignup from '@/components/auth/DailyChallengeInlineSignup';
import StreakMilestoneCelebration from './StreakMilestoneCelebration';
import TabbedDailyLeaderboard from './TabbedDailyLeaderboard';
import WatchAdButton from './WatchAdButton';
import KeepPlayingSection from './KeepPlayingSection';
import { useAuth } from '@/contexts/AuthContext';
import { fetchGeolocation } from '@/contexts/auth/authUtils';
import { useLanguage } from '@/contexts/LanguageContext';
import { awardDailyCoins, spendCoins, canAfford, getCoins, COIN_COSTS } from '@/utils/coinManager';
import { syncCoinsToDatabase } from '@/lib/supabase';
import { applyHebrewFinalLetters } from '@/shared/utils/wordNormalization';
import {
  generateDailyShareImage,
  downloadDailyShareImage,
} from '@/utils/dailyShareImage';
import type { Language } from '@/types';

// ============================================================================
// TYPES
// ============================================================================

interface WordHuntStats {
  totalPlayers: number;
  solvedCount: number;
  solveRate: number;
  attemptDistribution: Record<string, number>;
  avgAttemptsSolved: number | null;
  avgLifeRemaining?: number | null;
  avgEfficiencyScore?: number | null;
  maxEfficiencyScore?: number | null;
  avgWordsDiscovered?: number | null;
  yourStats?: {
    solved: boolean;
    attemptsUsed: number;
    percentile: number;
    rank?: number;
    efficiencyScore?: number;
    efficiencyPercentile?: number;
  };
}

interface DailyWordHuntResultsProps {
  result: WordHuntResult;
  puzzleNumber: number;
  puzzleDate: string;
  language: Language;
  countdown: string;
  isNewCompletion: boolean;
  onBack: () => void;
  onRetry: () => void;
  onGameLanguageChange?: (lang: Language) => void;
}

type ResultTab = 'results' | 'stats';

// ============================================================================
// CONSTANTS
// ============================================================================

const LANGUAGE_OPTIONS: { code: Language; flag: string; name: string }[] = [
  { code: 'en', flag: '🇺🇸', name: 'English' },
  { code: 'he', flag: '🇮🇱', name: 'עברית' },
  { code: 'sv', flag: '🇸🇪', name: 'Svenska' },
  { code: 'ja', flag: '🇯🇵', name: '日本語' },
  { code: 'es', flag: '🇪🇸', name: 'Español' },
];

const RANK_CONFETTI_COLORS: Record<number, string[]> = {
  1: ['#ffd700', '#ffed4a', '#f59e0b', '#fbbf24'],
  2: ['#c0c0c0', '#94a3b8', '#e2e8f0', '#cbd5e1'],
  3: ['#cd7f32', '#ea580c', '#f97316', '#fb923c'],
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

/** Compact score badge shown in header */
const ScoreBadge: React.FC<{
  solved: boolean;
  attemptsUsed: number;
  targetWord: string;
  streakDays: number;
  language: Language;
  onClick?: () => void;
}> = ({ solved, attemptsUsed, targetWord, streakDays, language, onClick }) => (
  <div
    className="flex items-center gap-2 cursor-pointer transition-transform hover:scale-[1.02] active:scale-[0.98]"
    onClick={onClick}
  >
    {solved ? (
      <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-500 rounded-neo border-2 border-neo-black">
        <Trophy className="w-4 h-4 text-white" />
        <span className="font-black text-white text-sm">{attemptsUsed}/10</span>
      </div>
    ) : (
      <div className="flex items-center gap-1.5 px-2 py-1 bg-gray-500 rounded-neo border-2 border-neo-black">
        <X className="w-4 h-4 text-white" />
        <span className="font-black text-white text-sm">X/10</span>
      </div>
    )}
    {solved && (
      <span className="font-black text-neo-yellow text-sm">
        {language === 'he' ? applyHebrewFinalLetters(targetWord) : targetWord.toUpperCase()}
      </span>
    )}
    {streakDays > 0 && (
      <span className="text-xs bg-orange-500 text-white px-1.5 py-0.5 rounded font-bold">
        🔥{streakDays}
      </span>
    )}
  </div>
);

/** Main result display - simplified hero section with core metrics */
const ResultDisplay: React.FC<{
  solved: boolean;
  attemptsUsed: number;
  targetWord: string;
  streakDays: number;
  language: Language;
  puzzleNumber: number;
  countdown: string;
  t: (key: string) => string;
}> = ({ solved, attemptsUsed, targetWord, streakDays, language, puzzleNumber, countdown, t }) => {
  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 0.2 }}
      className="text-center"
    >
      <div className="text-sm text-gray-600 dark:text-gray-300 uppercase font-bold">
        🎯 {t('daily.puzzleNumber').replace('{number}', String(puzzleNumber))}
      </div>

      {solved ? (
        <>
          <div className="text-4xl sm:text-5xl font-black mt-2 text-green-500">
            {attemptsUsed}/10
          </div>
          <div className="mt-2">
            <span className="text-xs text-gray-500 dark:text-gray-400">{t('wordHunt.results.targetWord')}: </span>
            <span className="text-xl sm:text-2xl font-black text-neo-yellow">
              {language === 'he' ? applyHebrewFinalLetters(targetWord) : targetWord.toUpperCase()}
            </span>
          </div>
        </>
      ) : (
        <div className="mt-4 space-y-3">
          <div className="text-lg text-gray-600 dark:text-gray-300">{t('wordHunt.results.betterLuckNextTime')}</div>
          <div className="inline-block px-5 py-3 bg-slate-600 rounded-neo border-3 border-neo-black shadow-hard">
            <div className="text-xs text-white/80 uppercase font-bold mb-1">{t('wordHunt.results.nextChallengeIn')}</div>
            <div className="text-2xl font-black text-white">{countdown}</div>
          </div>
        </div>
      )}

      {/* Streak display */}
      {streakDays > 0 && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', delay: 0.25 }}
          className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-500 rounded-neo border-2 border-neo-black shadow-hard-sm"
        >
          <span className="text-xl">🔥</span>
          <span className="font-black text-white text-sm">
            {streakDays} {streakDays === 1 ? t('daily.dayStreak') : t('daily.daysStreak')}
          </span>
        </motion.div>
      )}
    </motion.div>
  );
};

/** Collapsible details section for rewards and secondary info */
const CollapsibleDetails: React.FC<{
  coinReward: { awarded: number; breakdown: { base: number; efficiency: number; streak: number } } | null;
  survivalBonusTime: number;
  rarestWord: { word: string; rarity: number; emoji: string; label: string } | null;
  t: (key: string) => string;
}> = ({ coinReward, survivalBonusTime, rarestWord, t }) => {
  const [expanded, setExpanded] = useState(false);

  const getSurvivalBonusMessage = (bonusSeconds: number): { emoji: string; tier: string } => {
    if (bonusSeconds >= 120) return { emoji: '🏆', tier: 'legendary' };
    if (bonusSeconds >= 60) return { emoji: '⭐', tier: 'excellent' };
    if (bonusSeconds >= 30) return { emoji: '💪', tier: 'good' };
    if (bonusSeconds >= 10) return { emoji: '👍', tier: 'nice' };
    return { emoji: '🌱', tier: 'start' };
  };

  // Don't show if no details to display
  const hasDetails = (coinReward && coinReward.awarded > 0) || survivalBonusTime > 0 || (rarestWord && rarestWord.rarity >= 4);
  if (!hasDetails) return null;

  return (
    <div className="rounded-neo border-2 border-neo-black overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-2.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-neo-yellow" />
          <span className="text-xs font-bold text-gray-600 dark:text-gray-300 uppercase">
            {t('wordHunt.results.details') || 'Details & Rewards'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* Preview badges when collapsed */}
          {!expanded && (
            <div className="flex items-center gap-1.5">
              {coinReward && coinReward.awarded > 0 && (
                <span className="text-xs font-bold text-amber-600 dark:text-amber-400">+{coinReward.awarded}🪙</span>
              )}
              {survivalBonusTime > 0 && (
                <span className="text-xs font-bold text-cyan-600 dark:text-cyan-400">+{survivalBonusTime}s</span>
              )}
            </div>
          )}
          <motion.div animate={{ rotate: expanded ? 180 : 0 }}>
            <ChevronDown className="w-4 h-4 text-gray-500" />
          </motion.div>
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-3 space-y-3 bg-white dark:bg-slate-800">
              {/* Coin rewards */}
              {coinReward && coinReward.awarded > 0 && (
                <div className="flex items-center justify-between p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                  <div className="flex items-center gap-2">
                    <Coins className="w-5 h-5 text-amber-600" />
                    <span className="font-bold text-sm text-gray-700 dark:text-gray-200">{t('wordHunt.results.coinsEarned') || 'Coins Earned'}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-black text-lg text-amber-600 dark:text-amber-400">+{coinReward.awarded}</span>
                    {(coinReward.breakdown.base > 0 || coinReward.breakdown.efficiency > 0 || coinReward.breakdown.streak > 0) && (
                      <div className="text-[10px] text-gray-500 dark:text-gray-400">
                        {coinReward.breakdown.base > 0 && <span>Base: {coinReward.breakdown.base}</span>}
                        {coinReward.breakdown.efficiency > 0 && <span> + Efficiency: {coinReward.breakdown.efficiency}</span>}
                        {coinReward.breakdown.streak > 0 && <span> + Streak: {coinReward.breakdown.streak}</span>}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Survival bonus */}
              {survivalBonusTime > 0 && (
                <div className="flex items-center justify-between p-2 bg-cyan-50 dark:bg-cyan-900/20 rounded-lg border border-cyan-200 dark:border-cyan-800">
                  <div className="flex items-center gap-2">
                    <Timer className="w-5 h-5 text-cyan-600" />
                    <span className="font-bold text-sm text-gray-700 dark:text-gray-200">{t('wordHunt.results.survivalBonus')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-500">{getSurvivalBonusMessage(survivalBonusTime).emoji}</span>
                    <span className="font-black text-lg text-cyan-600 dark:text-cyan-400">+{survivalBonusTime}s</span>
                  </div>
                </div>
              )}

              {/* Rarest word */}
              {rarestWord && rarestWord.rarity >= 4 && (
                <div className="flex items-center justify-between p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-200 dark:border-indigo-800">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{rarestWord.emoji}</span>
                    <span className="font-bold text-sm text-gray-700 dark:text-gray-200">{rarestWord.label} {t('wordHunt.results.find')}</span>
                  </div>
                  <span className="font-black text-lg text-indigo-600 dark:text-indigo-400 tracking-wide">{rarestWord.word.toUpperCase()}</span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

/** Coin-gated unlock card (for retry/reveal features) */
const CoinUnlockCard: React.FC<{
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  cost: number;
  currentCoins: number;
  gradientFrom: string;
  gradientTo: string;
  onClick: () => void;
  t: (key: string) => string;
}> = ({ icon, title, subtitle, cost, currentCoins, gradientFrom, gradientTo, onClick, t }) => {
  const canAffordAction = currentCoins >= cost;

  return (
    <motion.div
      whileHover={canAffordAction ? { scale: 1.02, y: -2 } : {}}
      whileTap={canAffordAction ? { scale: 0.98 } : {}}
      className={cn(
        "relative overflow-hidden rounded-neo-lg border-3 border-neo-black shadow-hard transition-all",
        canAffordAction
          ? `bg-gradient-to-br ${gradientFrom} ${gradientTo} cursor-pointer hover:shadow-hard-lg`
          : "bg-gradient-to-br from-slate-600 to-slate-700"
      )}
      onClick={canAffordAction ? onClick : undefined}
    >
      {/* Cost badge */}
      <div className="absolute top-2 end-2 flex items-center gap-1 px-2.5 py-1 bg-neo-yellow rounded-full border-2 border-neo-black shadow-hard-sm">
        <Coins className="w-4 h-4 text-neo-black" />
        <span className="font-black text-sm text-neo-black">{cost}</span>
      </div>

      <div className="px-4 py-4 pt-3">
        <div className="flex items-center gap-3">
          <div className={cn(
            "flex-shrink-0 w-12 h-12 rounded-neo flex items-center justify-center border-2 border-neo-black",
            canAffordAction ? "bg-white/20" : "bg-white/10"
          )}>
            {icon}
          </div>
          <div className="flex-1 text-start">
            <div className={cn("font-black text-sm uppercase tracking-wide", canAffordAction ? "text-neo-black" : "text-white")}>
              {title}
            </div>
            <div className={cn("text-xs mt-0.5", canAffordAction ? "text-neo-black/70" : "text-white/70")}>
              {subtitle}
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className={cn("mt-3 pt-3 border-t", canAffordAction ? "border-neo-black/20" : "border-white/20")}>
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className={cn("font-medium", canAffordAction ? "text-neo-black/80" : "text-white/80")}>
              {t('wordHunt.results.yourCoins')}
            </span>
            <span className={cn("font-black", canAffordAction ? "text-neo-black" : "text-white")}>
              {currentCoins} / {cost}
            </span>
          </div>
          <div className="h-2.5 bg-black/30 rounded-full overflow-hidden border border-white/20">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min((currentCoins / cost) * 100, 100)}%` }}
              transition={{ duration: 0.5 }}
              className={cn("h-full rounded-full", canAffordAction ? "bg-neo-yellow" : "bg-neo-yellow/70")}
            />
          </div>
          {!canAffordAction && (
            <div className="mt-2 text-[10px] text-white/60 text-center">
              {t('wordHunt.results.earnMoreHint') || 'Win challenges to earn more coins!'}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

/** Share buttons section - always visible platform buttons */
const ShareSection: React.FC<{
  solved: boolean;
  onShare: () => void;
  onRetry: () => void;
  canAffordRetry: boolean;
  retryCost: number;
  onWhatsApp: () => void;
  onTwitter: () => void;
  onTelegram: () => void;
  onCopy: () => void;
  onDownloadImage: () => void;
  copied: boolean;
  isGeneratingImage: boolean;
  t: (key: string) => string;
}> = ({ solved, onShare, onRetry, canAffordRetry, retryCost, onWhatsApp, onTwitter, onTelegram, onCopy, onDownloadImage, copied, isGeneratingImage, t }) => (
  <motion.div
    initial={{ y: 20, opacity: 0 }}
    animate={{ y: 0, opacity: 1 }}
    transition={{ delay: 0.3 }}
    className="space-y-3"
  >
    {/* Primary share button */}
    <Button
      onClick={onShare}
      className={cn(
        "w-full py-3.5 text-lg font-black uppercase border-3 border-neo-black rounded-neo shadow-hard hover:shadow-hard-lg hover:-translate-y-0.5 transition-all",
        solved
          ? "bg-gradient-to-r from-neo-yellow via-neo-yellow to-neo-pink text-neo-black"
          : "bg-gradient-to-r from-neo-cyan via-neo-pink to-neo-pink text-white"
      )}
    >
      <Share2 className="mr-2 w-5 h-5" />
      {t('wordHunt.results.share') || 'Share'}
    </Button>

    {/* Platform buttons - always visible, icon-focused */}
    <div className="flex items-center justify-center gap-2">
      <button
        onClick={onWhatsApp}
        className="w-12 h-12 flex items-center justify-center rounded-full bg-[#25D366] text-white border-2 border-neo-black shadow-hard-sm hover:-translate-y-0.5 hover:shadow-hard transition-all"
        aria-label="Share on WhatsApp"
      >
        <WhatsAppIcon className="w-5 h-5" />
      </button>
      <button
        onClick={onTwitter}
        className="w-12 h-12 flex items-center justify-center rounded-full bg-black text-white border-2 border-gray-700 shadow-hard-sm hover:-translate-y-0.5 hover:shadow-hard transition-all"
        aria-label="Share on X/Twitter"
      >
        <XTwitterIcon className="w-5 h-5" />
      </button>
      <button
        onClick={onTelegram}
        className="w-12 h-12 flex items-center justify-center rounded-full bg-[#0088cc] text-white border-2 border-neo-black shadow-hard-sm hover:-translate-y-0.5 hover:shadow-hard transition-all"
        aria-label="Share on Telegram"
      >
        <Send className="w-5 h-5" />
      </button>
      <button
        onClick={onCopy}
        className="w-12 h-12 flex items-center justify-center rounded-full bg-gray-600 text-white border-2 border-neo-black shadow-hard-sm hover:-translate-y-0.5 hover:shadow-hard transition-all"
        aria-label={copied ? t('common.copied') : t('daily.copyToClipboard')}
      >
        {copied ? <Check className="w-5 h-5 text-neo-lime" /> : <Copy className="w-5 h-5" />}
      </button>
      <button
        onClick={onDownloadImage}
        disabled={isGeneratingImage}
        className="w-12 h-12 flex items-center justify-center rounded-full bg-neo-pink text-white border-2 border-neo-black shadow-hard-sm hover:-translate-y-0.5 hover:shadow-hard transition-all disabled:opacity-50"
        aria-label={t('daily.downloadImage')}
      >
        {isGeneratingImage ? (
          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : (
          <ImageDown className="w-5 h-5" />
        )}
      </button>
    </div>

    {/* Retry button - subtle for solved players, prominent for failed */}
    <Button
      onClick={onRetry}
      disabled={!canAffordRetry}
      className={cn(
        "w-full py-2 text-sm uppercase border-2 rounded-neo transition-all",
        solved
          ? "font-medium bg-transparent border-gray-400 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 shadow-none"
          : canAffordRetry
            ? "font-black bg-gradient-to-r from-amber-400 to-orange-500 text-neo-black border-neo-black shadow-hard hover:shadow-hard-lg hover:-translate-y-0.5"
            : "font-black bg-gray-400 text-gray-600 border-neo-black cursor-not-allowed shadow-hard"
      )}
    >
      <RotateCcw className="mr-1.5 w-4 h-4" />
      <span className="flex items-center gap-1">
        {t('wordHunt.results.retry') || 'Retry'}
        <span className="text-xs opacity-70">({retryCost}🪙)</span>
      </span>
    </Button>
  </motion.div>
);

/** Attempt history grid (Wordle-style) - collapsed by default for cleaner results */
const AttemptHistory: React.FC<{
  attempts: WordHuntResult['attempts'];
  attemptsUsed: number;
  t: (key: string) => string;
}> = ({ attempts, attemptsUsed, t }) => {
  const [expanded, setExpanded] = useState(false);

  if (attempts.length === 0) return null;

  return (
    <div className="rounded-neo border-2 border-neo-black overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-2.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
      >
        <span className="text-xs font-bold text-gray-600 dark:text-gray-300 uppercase">
          {t('wordHunt.title')} - {attemptsUsed} {t('common.attempts')}
        </span>
        <motion.div animate={{ rotate: expanded ? 180 : 0 }}>
          <ChevronDown className="w-4 h-4 text-gray-500" />
        </motion.div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-2.5 space-y-0.5 bg-white dark:bg-slate-800">
              {attempts.map((attempt, idx) => (
                <div key={idx} className="flex items-center justify-center gap-1.5">
                  <span className="text-[10px] text-gray-700 dark:text-gray-400 w-5">{idx + 1}.</span>
                  <div className="flex gap-0.5">
                    {attempt.feedback.map((letterFb, letterIdx) => (
                      <div
                        key={letterIdx}
                        className={cn(
                          "w-7 h-7 flex items-center justify-center font-bold text-white rounded border border-neo-black text-sm",
                          letterFb.feedback === 'green' && "bg-green-500",
                          letterFb.feedback === 'yellow' && "bg-yellow-500",
                          letterFb.feedback === 'gray' && "bg-gray-400"
                        )}
                      >
                        {letterFb.letter}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

/** Stats section with distribution histogram - collapsed by default for cleaner results */
const StatsSection: React.FC<{
  stats: WordHuntStats;
  result: WordHuntResult;
  t: (key: string) => string;
}> = ({ stats, result, t }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-neo border-2 border-neo-black overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-3 bg-white dark:bg-neo-navy-light hover:bg-gray-50 dark:hover:bg-neo-navy transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm">📊</span>
          <span className="text-sm font-bold text-gray-700 dark:text-gray-200">{t('wordHunt.stats.title')}</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs">
            {stats.yourStats?.solved && stats.yourStats.percentile !== undefined && (
              <span className="px-2 py-0.5 bg-neo-pink/20 text-neo-pink dark:text-purple-300 rounded-full font-bold">
                {t('wordHunt.stats.top')} {stats.yourStats.percentile}%
              </span>
            )}
            <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full font-bold">
              {stats.solveRate}% {t('wordHunt.stats.solved')}
            </span>
          </div>
          <motion.div animate={{ rotate: expanded ? 180 : 0 }}>
            <ChevronDown className="w-5 h-5 text-gray-500" />
          </motion.div>
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 pt-2 bg-white dark:bg-neo-navy-light border-t border-gray-200 dark:border-gray-700 space-y-4">
              {/* Stats grid */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-2 border border-blue-200 dark:border-blue-800">
                  <div className="text-lg font-black text-blue-600 dark:text-blue-400">{stats.totalPlayers}</div>
                  <div className="text-[10px] text-gray-600 dark:text-gray-400">{t('wordHunt.stats.totalPlayers')}</div>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-2 border border-green-200 dark:border-green-800">
                  <div className="text-lg font-black text-green-600 dark:text-green-400">{stats.solveRate}%</div>
                  <div className="text-[10px] text-gray-600 dark:text-gray-400">{t('wordHunt.stats.solveRate')}</div>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-2 border border-purple-200 dark:border-purple-800">
                  <div className="text-lg font-black text-purple-600 dark:text-purple-400">{stats.avgAttemptsSolved?.toFixed(1) ?? 'N/A'}</div>
                  <div className="text-[10px] text-gray-600 dark:text-gray-400">{t('wordHunt.stats.avgAttempts')}</div>
                </div>
              </div>

              {/* Distribution histogram */}
              <div className="space-y-0.5">
                <div className="text-[10px] font-bold text-gray-600 dark:text-gray-300 uppercase mb-1">
                  📈 {t('wordHunt.stats.distribution')}
                </div>
                {[...Array(10)].map((_, i) => {
                  const attemptNum = i + 1;
                  const count = stats.attemptDistribution[attemptNum] || 0;
                  const maxCount = Math.max(...Object.values(stats.attemptDistribution));
                  const percentage = maxCount > 0 ? (count / maxCount) * 100 : 0;
                  const isYourAttempt = result.solved && result.attemptsUsed === attemptNum;

                  return (
                    <div key={attemptNum} className="flex items-center gap-1.5">
                      <span className={cn("text-[10px] font-bold w-4", isYourAttempt ? "text-neo-yellow" : "text-gray-600 dark:text-gray-400")}>
                        {attemptNum}
                      </span>
                      <div className="flex-1 h-4 bg-gray-200 dark:bg-gray-700 rounded-sm overflow-hidden">
                        <div
                          style={{ width: `${percentage}%` }}
                          className={cn(
                            "h-full flex items-center justify-end px-1 text-[10px] font-bold text-white transition-all",
                            isYourAttempt ? "bg-amber-500" : "bg-emerald-500"
                          )}
                        >
                          {count > 0 && <span>{count}</span>}
                        </div>
                      </div>
                      {isYourAttempt && <span className="text-[10px] font-bold text-neo-yellow">{t('common.you').toUpperCase()}</span>}
                    </div>
                  );
                })}
              </div>

              {/* Survival stats */}
              {(stats.avgLifeRemaining != null || stats.avgEfficiencyScore != null) && (
                <div className="pt-3 border-t border-gray-200 dark:border-gray-700 space-y-2">
                  <div className="text-xs font-bold text-gray-600 dark:text-gray-300 uppercase">{t('wordHunt.results.survivalMetrics')}</div>
                  <div className="grid grid-cols-2 gap-2 text-center">
                    {stats.avgLifeRemaining != null && (
                      <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
                        <div className="text-lg font-black text-red-500">{stats.avgLifeRemaining.toFixed(0)}</div>
                        <div className="text-[10px] text-gray-600 dark:text-gray-400">{t('wordHunt.results.avgLifeLeft')}</div>
                      </div>
                    )}
                    {stats.avgEfficiencyScore != null && (
                      <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                        <div className="text-lg font-black text-purple-500">{stats.avgEfficiencyScore.toFixed(0)}</div>
                        <div className="text-[10px] text-gray-600 dark:text-gray-400">{t('wordHunt.results.avgEfficiency')}</div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

/** Try another language - compact inline version */
const TryAnotherLanguage: React.FC<{
  currentLanguage: Language;
  onGameLanguageChange?: (lang: Language) => void;
  t: (key: string) => string;
}> = ({ currentLanguage, onGameLanguageChange, t }) => {
  const availableLanguages = LANGUAGE_OPTIONS.filter(
    (option) => option.code !== currentLanguage && !hasPlayedWordHuntToday(option.code)
  );

  if (availableLanguages.length === 0 || !onGameLanguageChange) return null;

  return (
    <div className="flex items-center justify-center gap-2 text-xs text-gray-500 dark:text-gray-400">
      <span>{t('daily.tryAnotherLanguage') || 'Try another language'}:</span>
      <div className="flex items-center gap-1">
        {availableLanguages.map(opt => (
          <button
            key={opt.code}
            onClick={() => onGameLanguageChange(opt.code)}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 hover:scale-110 transition-all"
            title={opt.name}
          >
            <span className="text-lg">{opt.flag}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const DailyWordHuntResults: React.FC<DailyWordHuntResultsProps> = ({
  result,
  puzzleNumber,
  puzzleDate,
  language,
  countdown,
  isNewCompletion,
  onBack,
  onRetry,
  onGameLanguageChange,
}) => {
  const { t } = useLanguage();
  const [copied, setCopied] = useState(false);
  const [showSharePanel, setShowSharePanel] = useState(false);
  const [guestFingerprint, setGuestFingerprint] = useState<string | null>(null);
  const [guestPlayer, setGuestPlayer] = useState<GuestDailyPlayer | null>(null);
  const [stats, setStats] = useState<WordHuntStats | null>(null);
  const [showMilestoneCelebration, setShowMilestoneCelebration] = useState(false);
  const [coinReward, setCoinReward] = useState<{ awarded: number; breakdown: { base: number; efficiency: number; streak: number } } | null>(null);
  const [targetWordRevealed, setTargetWordRevealed] = useState(false);
  const [currentCoins, setCurrentCoins] = useState(() => getCoins());
  const [showSignupModal, setShowSignupModal] = useState(false);
  const [signupTrigger, setSignupTrigger] = useState<ConversionTrigger | null>(null);
  const [leaderboardKey, setLeaderboardKey] = useState(0);
  const [activeTab, setActiveTab] = useState<ResultTab>('results');
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [_countryCode, setCountryCode] = useState<string | null>(null);
  const [countryCodeReady, setCountryCodeReady] = useState(false);
  const [inlineSignupDismissed, setInlineSignupDismissed] = useState(false);
  const hasSubmittedRef = useRef(false);
  const { user, profile, isAuthenticated, loading: authLoading } = useAuth();
  const { isProtected } = useScreenshotProtection();

  // Derived values
  const streakMilestone = getStreakMilestone(result.streakDays);
  const milestoneMessage = streakMilestone ? getStreakMilestoneMessage(result.streakDays) : null;
  const rarestWord = result.wordsDiscovered ? findRarestWord(result.wordsDiscovered, language) : null;

  const survivalBonusTime = useMemo(() => {
    if (!result.wordsDiscovered || result.wordsDiscovered.length === 0) return 0;
    return result.wordsDiscovered.reduce((total, word) => total + (word.lifeGained || 0), 0);
  }, [result.wordsDiscovered]);

  const displayName = isAuthenticated && profile
    ? profile.display_name || profile.username || 'Player'
    : guestPlayer?.displayName || 'Player';
  const avatarEmoji = isAuthenticated && profile
    ? profile.avatar_emoji || '🎯'
    : guestPlayer?.avatarEmoji || '🎯';
  const avatarImage = isAuthenticated && profile
    ? profile.avatar_image || null
    : null;

  // Share URL and text
  const shareUrl = useMemo(() => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://www.lexiclash.live';
    const params = new URLSearchParams({
      whSolved: String(result.solved),
      whAttempts: String(result.attemptsUsed),
      whPuzzle: String(puzzleNumber),
      whName: displayName,
      whEmoji: avatarEmoji,
    });
    // Add custom avatar image if available (for OG image rendering)
    if (avatarImage) {
      const avatarFilename = avatarImage.endsWith('.png') ? avatarImage : `${avatarImage}.png`;
      params.set('whAvatar', avatarFilename);
    }
    return `${origin}/${language}/daily?${params.toString()}`;
  }, [result.solved, result.attemptsUsed, puzzleNumber, displayName, avatarEmoji, avatarImage, language]);

  const shareText = generateWordHuntShareableResult(
    { ...result, puzzleNumber, puzzleDate, language, streakDays: result.streakDays || 0, completedAt: result.completedAt || new Date().toISOString() },
    t
  );
  const shareTextWithUrl = useMemo(() => `${shareText}\n${shareUrl}`, [shareText, shareUrl]);

  // ============================================================================
  // EFFECTS
  // ============================================================================

  // Get guest fingerprint and player info
  useEffect(() => {
    getGuestFingerprint().then(setGuestFingerprint);
    if (!isAuthenticated) {
      getGuestDailyPlayer().then(setGuestPlayer);
    }
  }, [isAuthenticated]);

  // Fetch country code
  useEffect(() => {
    if (isAuthenticated && profile?.country_code) {
      setCountryCode(profile.country_code);
      setCountryCodeReady(true);
      return;
    }
    fetchGeolocation()
      .then((geo) => { setCountryCode(geo.countryCode || null); setCountryCodeReady(true); })
      .catch(() => setCountryCodeReady(true));
    const timeout = setTimeout(() => setCountryCodeReady(true), 2000);
    return () => clearTimeout(timeout);
  }, [isAuthenticated, profile?.country_code]);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (isAuthenticated && profile) params.append('playerId', profile.id);
      else if (guestFingerprint) params.append('guestFingerprint', guestFingerprint);
      const response = await fetch(`/api/daily-challenge/word-hunt/stats/${puzzleDate}/${language}?${params.toString()}`);
      if (response.ok) setStats(await response.json());
    } catch (err) {
      console.error('Failed to fetch Word Hunt stats:', err);
    }
  }, [puzzleDate, language, isAuthenticated, profile, guestFingerprint]);

  // Submit result
  useEffect(() => {
    const storedResult = getTodaysWordHuntResult(language);
    const needsRetrySubmission = !isNewCompletion && storedResult && storedResult.submittedToServer === false;
    const canSubmit = (isNewCompletion || needsRetrySubmission) && result && guestFingerprint && countryCodeReady && (isAuthenticated ? !!profile : true);

    if (canSubmit && !hasSubmittedRef.current) {
      hasSubmittedRef.current = true;
      const submitResult = async () => {
        try {
          const submitDisplayName = isAuthenticated && profile ? profile.display_name || profile.username : guestPlayer?.displayName || 'Guest Player';
          const submitAvatarEmoji = isAuthenticated && profile ? profile.avatar_emoji : guestPlayer?.avatarEmoji || '🎯';
          const submitAvatarColor = isAuthenticated && profile ? profile.avatar_color : guestPlayer?.avatarColor || '#6366f1';

          let fetchedCountryCode: string | null = null;
          try {
            const geoResponse = await fetch('/api/geolocation');
            if (geoResponse.ok) fetchedCountryCode = (await geoResponse.json()).countryCode || null;
          } catch {}

          const bodyData: Record<string, unknown> = {
            puzzleDate, puzzleNumber, language,
            playerId: isAuthenticated && profile ? profile.id : null,
            guestFingerprint: !isAuthenticated ? guestFingerprint : null,
            displayName: submitDisplayName, avatarEmoji: submitAvatarEmoji, avatarColor: submitAvatarColor,
            countryCode: fetchedCountryCode,
            solved: result.solved, attemptsUsed: result.attemptsUsed, targetWord: result.targetWord,
            attemptWords: result.attempts.map(a => ({ word: a.word, feedback: a.feedback.map(f => ({ letter: f.letter, feedback: f.feedback, position: f.position })), timestamp: a.timestamp })),
          };
          if (result.wordsDiscovered) bodyData.wordsDiscovered = result.wordsDiscovered;
          if (result.lifeRemaining !== undefined) bodyData.lifeRemaining = result.lifeRemaining;
          if (result.clueTokensEarned !== undefined) bodyData.clueTokensEarned = result.clueTokensEarned;
          if (result.clueTokensSpent !== undefined) bodyData.clueTokensSpent = result.clueTokensSpent;
          if (result.hintsUnlocked !== undefined) bodyData.hintsUnlocked = result.hintsUnlocked;
          if (result.efficiencyScore !== undefined) bodyData.efficiencyScore = result.efficiencyScore;

          const response = await fetch('/api/daily-challenge/word-hunt/submit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(bodyData) });
          if (!response.ok) return;
          const responseData = await response.json();
          if (!responseData.alreadySubmitted) markWordHuntResultSubmitted(language);
          setLeaderboardKey(prev => prev + 1);
          fetchStats();
        } catch (err) {
          console.error('Failed to submit Word Hunt result:', err);
        }
      };
      submitResult();
    } else if (!isNewCompletion) {
      fetchStats();
    }
  }, [isNewCompletion, result, guestFingerprint, puzzleDate, puzzleNumber, language, isAuthenticated, profile, guestPlayer, countryCodeReady, fetchStats]);

  // Fire confetti on victory
  useEffect(() => {
    if (isNewCompletion && result.solved) {
      const duration = 2500;
      const end = Date.now() + duration;
      const frame = () => {
        fireConfetti({ particleCount: 3, angle: 60, spread: 55, origin: { x: 0 }, colors: ['#10B981', '#FFE135', '#00D9FF'] });
        fireConfetti({ particleCount: 3, angle: 120, spread: 55, origin: { x: 1 }, colors: ['#10B981', '#FFE135', '#00D9FF'] });
        if (Date.now() < end) requestAnimationFrame(frame);
      };
      frame();
      if (result.attemptsUsed <= 3) {
        setTimeout(() => fireConfetti({ particleCount: 150, spread: 120, origin: { y: 0.6 }, colors: ['#10B981', '#FFE135', '#FF1493'] }), 500);
      }
    }
  }, [isNewCompletion, result.solved, result.attemptsUsed]);

  // Fire rank confetti for top 3
  useEffect(() => {
    if (isNewCompletion && stats?.yourStats?.solved && stats.yourStats.rank !== undefined && stats.yourStats.rank <= 3) {
      const colors = RANK_CONFETTI_COLORS[stats.yourStats.rank] || RANK_CONFETTI_COLORS[1];
      const count = Math.floor(100 * (1.2 - stats.yourStats.rank * 0.15));
      const timer = setTimeout(() => {
        fireConfetti({ particleCount: Math.floor(count * 0.35), spread: 26, startVelocity: 55, origin: { y: 0.6 }, colors });
        fireConfetti({ particleCount: Math.floor(count * 0.25), spread: 60, origin: { y: 0.6 }, colors });
        fireConfetti({ particleCount: Math.floor(count * 0.4), spread: 100, decay: 0.91, scalar: 0.9, origin: { y: 0.6 }, colors });
      }, 2800);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [isNewCompletion, stats?.yourStats]);

  // Show streak milestone
  useEffect(() => {
    if (isNewCompletion && milestoneMessage) {
      const timer = setTimeout(() => setShowMilestoneCelebration(true), 1500);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [isNewCompletion, milestoneMessage]);

  // Award coins
  useEffect(() => {
    if (isNewCompletion) {
      const reward = awardDailyCoins(puzzleDate, language, result.solved, result.efficiencyScore || 0, result.streakDays || 0);
      if (reward) {
        setCoinReward(reward);
        if (user?.id && reward.awarded > 0) {
          syncCoinsToDatabase(user.id, reward.awarded, 'Daily Challenge', { puzzleDate, language, solved: result.solved ? 1 : 0, efficiencyScore: result.efficiencyScore || 0, streakDays: result.streakDays || 0 });
        }
      }
    }
  }, [isNewCompletion, puzzleDate, language, result.solved, result.efficiencyScore, result.streakDays, user?.id]);

  // Show signup modal for failed guests
  useEffect(() => {
    if (!isNewCompletion || isAuthenticated || user || authLoading || result.solved) return;
    const timer = setTimeout(() => {
      const trigger = getConversionTrigger(result, stats?.yourStats?.percentile);
      if (trigger) { setSignupTrigger(trigger); setShowSignupModal(true); }
    }, 3000);
    return () => clearTimeout(timer);
  }, [isNewCompletion, isAuthenticated, user, authLoading, result, stats?.yourStats?.percentile]);

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareTextWithUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }, [shareTextWithUrl]);

  const handleWhatsApp = useCallback(() => window.open(`https://wa.me/?text=${encodeURIComponent(shareTextWithUrl)}`, '_blank'), [shareTextWithUrl]);
  const handleTwitter = useCallback(() => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareTextWithUrl)}`, '_blank'), [shareTextWithUrl]);
  const handleTelegram = useCallback(() => window.open(`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`, '_blank'), [shareText, shareUrl]);

  const handleNativeShare = useCallback(async () => {
    if (navigator.share) {
      try { await navigator.share({ text: shareTextWithUrl }); } catch {}
    } else {
      setShowSharePanel(true);
    }
  }, [shareTextWithUrl]);

  const handleDownloadShareImage = useCallback(async () => {
    if (isGeneratingImage) return;
    setIsGeneratingImage(true);
    try {
      const imageResult = await generateDailyShareImage({
        gameType: 'wordHunt', rank: stats?.yourStats?.rank || null, totalPlayers: stats?.totalPlayers || 0,
        puzzleNumber, language, solved: result.solved, attemptsUsed: result.attemptsUsed,
        displayName: isAuthenticated && profile ? profile.display_name || profile.username : guestPlayer?.displayName,
        avatarEmoji: isAuthenticated && profile ? profile.avatar_emoji : guestPlayer?.avatarEmoji,
      });
      downloadDailyShareImage(imageResult, 'wordHunt', puzzleNumber);
    } catch {} finally {
      setIsGeneratingImage(false);
    }
  }, [isGeneratingImage, stats, puzzleNumber, language, result.solved, result.attemptsUsed, isAuthenticated, profile, guestPlayer]);

  const handleRevealTargetWord = useCallback(() => {
    if (!canAfford(COIN_COSTS.REVEAL_TARGET_WORD)) return;
    if (spendCoins(COIN_COSTS.REVEAL_TARGET_WORD, 'Reveal Target Word', { puzzleDate, language })) {
      setTargetWordRevealed(true);
      setCurrentCoins(getCoins());
    }
  }, [puzzleDate, language]);

  const handleRetryChallenge = useCallback(() => {
    if (!canAfford(COIN_COSTS.DAILY_RETRY)) return;
    if (spendCoins(COIN_COSTS.DAILY_RETRY, 'Daily Challenge Retry', { puzzleDate, language, puzzleNumber: String(puzzleNumber) })) {
      setCurrentCoins(getCoins());
      onRetry();
    }
  }, [puzzleDate, language, puzzleNumber, onRetry]);

  const handleSignupModalClose = useCallback(() => { setShowSignupModal(false); recordSignupModalDismissed(); }, []);

  const handleScoreBadgeClick = useCallback(() => {
    if (result.solved) {
      if (stats?.yourStats?.rank && stats.yourStats.rank <= 3) fireRankConfetti(stats.yourStats.rank);
      else fireVictoryConfetti();
    }
  }, [result.solved, stats?.yourStats?.rank]);

  // ============================================================================
  // RENDER
  // ============================================================================

  const renderResultsContent = () => (
    <div className="space-y-4">
      {/* Hero section: Score + Rank */}
      <ResultDisplay
        solved={result.solved}
        attemptsUsed={result.attemptsUsed}
        targetWord={result.targetWord}
        streakDays={result.streakDays}
        language={language}
        puzzleNumber={puzzleNumber}
        countdown={countdown}
        t={t}
      />

      {/* Rank badge */}
      {stats?.yourStats?.solved && stats.yourStats.rank !== undefined && (
        <motion.div
          initial={{ scale: 0, rotate: -10 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', delay: 0.3 }}
          className="flex justify-center"
        >
          <div className="inline-block px-4 py-2 bg-amber-400 rounded-neo border-2 border-neo-black shadow-hard-sm">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-neo-black" />
              <span className="font-black text-neo-black text-sm">
                {t('wordHunt.results.rankOutOf').replace('{rank}', String(stats.yourStats.rank)).replace('{total}', String(stats.totalPlayers))}
              </span>
            </div>
          </div>
        </motion.div>
      )}

      <ShareSection
        solved={result.solved}
        onShare={handleNativeShare}
        onRetry={handleRetryChallenge}
        canAffordRetry={canAfford(COIN_COSTS.DAILY_RETRY)}
        retryCost={COIN_COSTS.DAILY_RETRY}
        onWhatsApp={handleWhatsApp}
        onTwitter={handleTwitter}
        onTelegram={handleTelegram}
        onCopy={handleCopy}
        onDownloadImage={handleDownloadShareImage}
        copied={copied}
        isGeneratingImage={isGeneratingImage}
        t={t}
      />

      {/* Leaderboard - inline in results */}
      <TabbedDailyLeaderboard
        key={leaderboardKey}
        puzzleDate={puzzleDate}
        language={language}
        currentPlayerId={isAuthenticated && profile ? profile.id : null}
        currentGuestFingerprint={!isAuthenticated ? guestFingerprint : null}
        maxVisible={5}
        t={t}
        defaultTab="today"
      />

      {/* Collapsible details for rewards and secondary info */}
      <CollapsibleDetails
        coinReward={coinReward}
        survivalBonusTime={survivalBonusTime}
        rarestWord={rarestWord}
        t={t}
      />

      {/* Watch Ad for Coins */}
      {!canAfford(COIN_COSTS.DAILY_RETRY) && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <div className="flex-1 h-px bg-gray-600" />
            <span>{t('wordHunt.ad.needMoreCoins') || 'Need more coins?'}</span>
            <div className="flex-1 h-px bg-gray-600" />
          </div>
          <WatchAdButton onCoinsEarned={(_, newTotal) => setCurrentCoins(newTotal)} t={t} />
        </div>
      )}

      {/* Reveal target word for failed players */}
      {!result.solved && (
        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
          {targetWordRevealed ? (
            <div className="space-y-2 text-center">
              <div className="text-sm text-gray-600 dark:text-gray-400">{t('wordHunt.results.theTargetWordWas')}</div>
              <div className="text-3xl font-black text-neo-yellow tracking-wider">
                {language === 'he' ? applyHebrewFinalLetters(result.targetWord) : result.targetWord.toUpperCase()}
              </div>
            </div>
          ) : (
            <div className="max-w-xs mx-auto">
              <CoinUnlockCard
                icon={<Eye className="w-6 h-6 text-white" />}
                title={t('wordHunt.results.revealTargetWord')}
                subtitle={t('wordHunt.results.seeTheAnswer') || 'See what you were looking for'}
                cost={COIN_COSTS.REVEAL_TARGET_WORD}
                currentCoins={currentCoins}
                gradientFrom="from-neo-pink"
                gradientTo="to-neo-pink"
                onClick={handleRevealTargetWord}
                t={t}
              />
            </div>
          )}
        </div>
      )}

      <TryAnotherLanguage currentLanguage={language} onGameLanguageChange={onGameLanguageChange} t={t} />

      {/* Inline signup for guest winners */}
      {!isAuthenticated && result.solved && !inlineSignupDismissed && (
        <DailyChallengeInlineSignup
          pendingResult={{ result, puzzleNumber, puzzleDate, language }}
          onDismiss={() => setInlineSignupDismissed(true)}
        />
      )}

      <KeepPlayingSection
        isSuccess={result.solved}
        timeSurvived={result.lifeRemaining !== undefined ? (10 - result.attemptsUsed) * 10 : undefined}
        efficiencyScore={result.efficiencyScore}
      />
    </div>
  );

  const renderStatsContent = () => (
    <div className="space-y-4">
      <AttemptHistory attempts={result.attempts} attemptsUsed={result.attemptsUsed} t={t} />
      {stats && <StatsSection stats={stats} result={result} t={t} />}
    </div>
  );


  return (
    <motion.div
      key="word-hunt-results"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex-1 flex flex-col h-full overflow-hidden"
    >
      {/* Header */}
      <div className="flex-shrink-0 px-3 pt-1 pb-2 border-b border-gray-200 dark:border-gray-700 bg-slate-50 dark:bg-neo-navy">
        <div className="max-w-md mx-auto lg:max-w-5xl">
          <div className="flex items-center justify-between gap-2">
            <Button variant="ghost" size="sm" onClick={onBack} className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white -ms-2 py-1">
              <ArrowLeft className="w-4 h-4 me-1 rtl:rotate-180" />
              {t('daily.home')}
            </Button>
            <ScoreBadge
              solved={result.solved}
              attemptsUsed={result.attemptsUsed}
              targetWord={result.targetWord}
              streakDays={result.streakDays}
              language={language}
              onClick={handleScoreBadgeClick}
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto px-3 pb-20 lg:pb-4 relative">
        {/* Screenshot protection */}
        {isProtected && (
          <div className="absolute inset-0 flex items-center justify-center z-20 bg-black/40">
            <div className="bg-neo-black/80 text-white px-6 py-4 rounded-neo border-3 border-neo-yellow shadow-hard text-center">
              <div className="text-2xl mb-2">👀</div>
              <div className="font-bold text-sm">{t('daily.screenshotProtection') || 'Click here to continue'}</div>
            </div>
          </div>
        )}

        {/* Desktop: Two-column layout */}
        <div className="hidden md:flex md:flex-row md:gap-6 md:max-w-5xl md:mx-auto md:pt-4">
          <div className={cn("flex-1 min-w-0 max-w-xl", isProtected && "blur-xl pointer-events-none select-none")}>
            {renderResultsContent()}
          </div>
          <div className={cn("flex-1 min-w-0 max-w-xl space-y-4", isProtected && "blur-xl pointer-events-none select-none")}>
            {/* Desktop stats card */}
            <div className="bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800 border-3 border-neo-black rounded-neo p-4 shadow-hard">
              <h3 className="text-sm font-black uppercase text-white mb-3 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-neo-cyan" />
                {t('wordHunt.stats.title') || 'Statistics'}
              </h3>
              {stats ? (
                <div className="space-y-3">
                  {stats.yourStats && (
                    <div className="text-center">
                      <span className="text-3xl font-black text-neo-yellow">{stats.yourStats.percentile}%</span>
                      <span className="text-white/70 text-sm block">{t('wordHunt.stats.betterThan')}</span>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-2 text-center">
                    <div className="bg-white/10 rounded-neo p-2">
                      <div className="text-lg font-black text-white">{stats.totalPlayers}</div>
                      <div className="text-[10px] text-white/60 uppercase font-bold">{t('wordHunt.stats.totalPlayers')}</div>
                    </div>
                    <div className="bg-white/10 rounded-neo p-2">
                      <div className="text-lg font-black text-white">{Math.round(stats.solveRate)}%</div>
                      <div className="text-[10px] text-white/60 uppercase font-bold">{t('wordHunt.stats.solveRate')}</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-white/50 text-sm">{t('common.loading')}</div>
              )}
            </div>
            <TabbedDailyLeaderboard
              puzzleDate={puzzleDate}
              language={language}
              currentPlayerId={isAuthenticated && profile ? profile.id : null}
              currentGuestFingerprint={!isAuthenticated ? guestFingerprint : null}
              maxVisible={5}
              t={t}
              defaultTab="today"
            />
          </div>
        </div>

        {/* Mobile: Tab-based layout */}
        <div className={cn("max-w-md mx-auto pt-3 md:hidden", isProtected && "blur-xl pointer-events-none select-none")}>
          {activeTab === 'results' && renderResultsContent()}
          {activeTab === 'stats' && renderStatsContent()}
        </div>
      </div>

      {/* Mobile Tab Bar */}
      <div className="flex-shrink-0 fixed bottom-0 inset-x-0 z-50 bg-neo-navy border-t-4 border-neo-black safe-area-bottom md:hidden">
        <MobileTabBar
          tabs={[
            { id: 'results', icon: <Trophy className="w-5 h-5" />, label: t('wordHunt.results.title') || 'Results' },
            { id: 'stats', icon: <BarChart3 className="w-5 h-5" />, label: t('wordHunt.stats.title') || 'Stats' },
          ]}
          activeTab={activeTab}
          onTabChange={(id) => setActiveTab(id as ResultTab)}
        />
      </div>

      {/* Share Panel Modal */}
      <AnimatePresence>
        {showSharePanel && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowSharePanel(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-neo-navy rounded-neo border-4 border-neo-black p-6 max-w-sm w-full"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="text-xl font-black mb-4">{t('wordHunt.shareResult')}</h3>
              <div className="space-y-3">
                <Button onClick={handleWhatsApp} className="w-full py-3 bg-[#25D366] text-white border-3 border-neo-black rounded-neo">
                  <WhatsAppIcon className="mr-2 w-5 h-5" />WhatsApp
                </Button>
                <Button onClick={handleTwitter} className="w-full py-3 bg-black text-white border-3 border-gray-700 rounded-neo">
                  <XTwitterIcon className="mr-2 w-5 h-5" />X / Twitter
                </Button>
                <Button onClick={handleTelegram} className="w-full py-3 bg-[#0088cc] text-white border-3 border-neo-black rounded-neo">
                  <Send className="mr-2 w-5 h-5" />Telegram
                </Button>
                <Button onClick={handleCopy} className="w-full py-3 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white border-3 border-neo-black rounded-neo">
                  {copied ? <><Check className="mr-2 w-5 h-5 text-neo-lime" />{t('common.copied')}</> : <><Copy className="mr-2 w-5 h-5" />{t('daily.copyToClipboard')}</>}
                </Button>
              </div>
              <Button onClick={() => setShowSharePanel(false)} variant="ghost" className="w-full mt-4">{t('daily.close')}</Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modals */}
      {milestoneMessage && (
        <StreakMilestoneCelebration
          isOpen={showMilestoneCelebration}
          onClose={() => setShowMilestoneCelebration(false)}
          streak={result.streakDays}
          emoji={milestoneMessage.emoji}
          title={milestoneMessage.title}
          subtitle={milestoneMessage.subtitle}
        />
      )}
      {signupTrigger && (
        <DailyChallengeSignupModal
          isOpen={showSignupModal}
          onClose={handleSignupModalClose}
          trigger={signupTrigger}
          streakDays={result.streakDays}
          percentile={stats?.yourStats?.percentile}
          attemptsUsed={result.attemptsUsed}
          solved={result.solved}
          pendingResult={{ result, puzzleNumber, puzzleDate, language }}
        />
      )}
    </motion.div>
  );
};

export default DailyWordHuntResults;
