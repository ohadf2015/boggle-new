'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { Trophy, Flame, X, Share2 } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { cn } from '../../lib/utils';
import UnifiedShareModal from '../modals/UnifiedShareModal';
import { type GameResultForShare } from '../../utils/share';

interface Achievement {
  id?: string;
  key?: string;
  icon?: string;
  name?: string;
}

interface ShareWinPromptProps {
  isWinner: boolean;
  username: string;
  score: number;
  wordCount: number;
  achievements?: Achievement[];
  gameCode: string;
  streakDays?: number;
  onClose?: () => void;
  compact?: boolean;
  // Enhanced share card data
  maxCombo?: number;
  archetype?: { id: string; name: string; emoji: string } | null;
  placement?: number;
  totalPlayers?: number;
  longestWord?: string;
}

// Witty messages by score tier and language
const WITTY_MESSAGES: Record<string, Record<string, string[]>> = {
  en: {
    legendary: [
      "My dictionary is scared of me now",
      "Brain cells: fully deployed",
      "Wordsmith extraordinaire reporting for duty",
      "They said it couldn't be done...",
      "I didn't choose the word life, it chose me",
      "Merriam-Webster just called. They're impressed.",
      "Bow before your vocabulary overlord",
      "I see letters. I conquer letters.",
    ],
    amazing: [
      "Vocabulary? Checked. Opponents? Wrecked.",
      "Is this what genius feels like?",
      "Words just hit different today",
      "Main character energy unlocked",
      "My brain was ON today",
      "Spelling bee dropout making a comeback",
      "The letters never stood a chance",
      "Peak word-finding performance",
    ],
    good: [
      "Not too shabby, if I do say so myself",
      "The letters feared me today",
      "Autocorrect could never",
      "English class finally paying off",
      "Decent day at the word office",
      "The board was good to me",
      "Solid wordwork today",
      "Getting warmed up",
    ],
    normal: [
      "Every word counts!",
      "Fun was had, words were found",
      "The journey matters, right?",
      "Still learning the ropes",
      "Warming up for the next round",
      "Practice makes perfect!",
    ],
  },
  he: {
    legendary: [
      "המילון מפחד ממני עכשיו",
      "תאי המוח: במלוא הכוח",
      "מומחה מילים בשירות",
      "אין מילים לתאר את זה. רגע, יש.",
      "האקדמיה ללשון רוצה לגייס אותי",
    ],
    amazing: [
      "אוצר מילים? יש. יריבים? מרוסקים.",
      "זו תחושת גאונות?",
      "המילים פשוט זורמות היום",
      "המוח שלי היה במיטבו",
      "האותיות לא עמדו בסיכוי",
    ],
    good: [
      "לא רע בכלל",
      "האותיות פחדו ממני היום",
      "שיעורי עברית סוף סוף משתלמים",
      "יום טוב במשרד המילים",
      "מתחממים לסיבוב הבא",
    ],
    normal: [
      "כל מילה חשובה!",
      "היה כיף, מצאנו מילים",
      "המסע הוא מה שחשוב",
      "תרגול עושה מושלם!",
    ],
  },
  sv: {
    legendary: [
      "Ordboken är rädd för mig nu",
      "Ordmästare i tjänst",
      "Bokstäverna hade ingen chans",
      "Svenska Akademien vill rekrytera mig",
    ],
    amazing: [
      "Ordförråd? Check. Motståndare? Krossade.",
      "Min hjärna var PÅ idag",
      "Toppnivå ordprestanda",
    ],
    good: [
      "Inte illa alls",
      "Bokstäverna var rädda idag",
      "En bra dag på ordkontoret",
    ],
    normal: [
      "Varje ord räknas!",
      "Övning ger färdighet!",
    ],
  },
  es: {
    legendary: [
      "El diccionario me tiene miedo",
      "Maestro de palabras al servicio",
      "Las letras no tenían oportunidad",
      "La RAE quiere reclutarme",
    ],
    amazing: [
      "¿Vocabulario? Listo. ¿Oponentes? Destruidos.",
      "Mi cerebro estaba EN FUEGO hoy",
      "Rendimiento máximo de palabras",
    ],
    good: [
      "Nada mal",
      "Las letras me temían hoy",
      "Buen día en la oficina de palabras",
    ],
    normal: [
      "¡Cada palabra cuenta!",
      "¡La práctica hace al maestro!",
    ],
  },
  ja: {
    legendary: [
      "辞書が私を恐れている",
      "言葉マスター参上",
      "文字たちに勝ち目はなかった",
      "脳細胞フル稼働",
    ],
    amazing: [
      "語彙力? 完璧。対戦相手? 粉砕。",
      "今日の脳は絶好調",
      "最高のパフォーマンス",
    ],
    good: [
      "なかなかいいね",
      "文字たちは怯えていた",
      "いい感じに温まってきた",
    ],
    normal: [
      "一語一語が大切!",
      "練習は裏切らない!",
    ],
  },
};

// Helper to pick random item from array
const pickRandom = <T,>(arr: T[]): T => {
  const item = arr[Math.floor(Math.random() * arr.length)];
  if (item === undefined) {
    throw new Error('pickRandom called with empty array');
  }
  return item;
};

/**
 * ShareWinPrompt - Simplified post-game share component
 *
 * Shows stats + witty message with a single "Share" CTA
 * Opens UnifiedShareModal for actual sharing
 */
const ShareWinPrompt: React.FC<ShareWinPromptProps> = ({
  isWinner,
  score,
  wordCount,
  achievements = [],
  gameCode,
  streakDays = 0,
  onClose,
  compact = false,
  maxCombo,
  archetype,
  placement,
  totalPlayers,
  longestWord,
}) => {
  const { t, language } = useLanguage();
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  // Generate witty message based on score tier
  const wittyMessage = useMemo(() => {
    const lang = WITTY_MESSAGES[language] || WITTY_MESSAGES.en;

    let tier: string;
    if (score > 150) tier = 'legendary';
    else if (score > 100) tier = 'amazing';
    else if (score > 50) tier = 'good';
    else tier = 'normal';

    const messages = lang[tier] || lang.normal || WITTY_MESSAGES.en.normal;
    return pickRandom(messages);
  }, [score, language]);

  // Prepare game result for modal
  const gameResult: GameResultForShare = useMemo(() => ({
    score,
    wordCount,
    isWinner,
    achievements: achievements.map((a, i) => ({ id: a.id || a.key || `achievement-${i}`, icon: a.icon })),
    streakDays,
    maxCombo,
    archetype: archetype ? {
      id: archetype.id,
      name: archetype.name,
      emoji: archetype.emoji,
    } : undefined,
    placement,
    totalPlayers,
    longestWord,
  }), [score, wordCount, isWinner, achievements, streakDays, maxCombo, archetype, placement, totalPlayers, longestWord]);

  // Share handler: always open modal first for better UX
  // Modal has nice branded UI ready for screenshot/sharing
  const handleShare = useCallback(() => {
    setIsShareModalOpen(true);
  }, []);

  // Streak encouragement - motivate users close to milestones
  const streakEncouragement = useMemo(() => {
    if (streakDays === 6) {
      return `🔥 ${t('results.streakOneWeek')}`;
    }
    if (streakDays === 13) {
      return `🔥 ${t('results.streakTwoWeeks')}`;
    }
    if (streakDays === 29) {
      return `🔥 ${t('results.streakOneMonth')}`;
    }
    if (streakDays >= 7 && streakDays % 7 === 0) {
      const weeks = Math.floor(streakDays / 7);
      return `🎯 ${t('results.streakWeeks', { weeks: String(weeks) })}`;
    }
    return null;
  }, [streakDays, t]);

  // Don't show for non-winners with low scores
  if (!isWinner && score < 30) return null;

  // Compact inline version - just a share button
  if (compact) {
    return (
      <>
        <m.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            'flex items-center justify-center gap-3 p-3 rounded-xl border-2',
            'bg-neo-navy-light/60 border-neo-cyan/30'
          )}
        >
          <span className={cn('text-sm font-bold', 'text-neo-cyan')}>
            {t('results.shareVictoryPrompt')}
          </span>
          <m.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleShare}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2 font-bold text-sm rounded-neo',
              'border-2 border-neo-black shadow-hard-sm',
              'hover:shadow-hard-md hover:-translate-y-0.5 transition-all',
              'bg-neo-lime text-neo-black',
              'focus:outline-hidden focus:ring-2 focus:ring-neo-cyan focus:ring-offset-2'
            )}
            aria-label={t('results.share')}
          >
            <Share2 size={14} />
            <span>{t('results.share')}</span>
          </m.button>
        </m.div>

        <UnifiedShareModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          gameCode={gameCode}
          t={t}
          context="post-game"
          gameResult={gameResult}
          language={language}
          wittyMessage={wittyMessage}
        />
      </>
    );
  }

  return (
    <>
      <AnimatePresence>
        <m.div
          key="share-win-prompt"
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          className={cn(
          'relative p-4 sm:p-5 rounded-2xl border-3 overflow-hidden',
          isWinner
            ? 'bg-linear-to-br from-neo-lime/20 via-neo-navy to-neo-pink/20 border-neo-lime/60 shadow-hard-lg'
            : 'bg-linear-to-br from-neo-cyan/20 via-neo-navy to-neo-purple/20 border-neo-cyan/50 shadow-hard-md'
        )}
      >
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-40 h-40 bg-linear-to-bl from-white/15 to-transparent rounded-full blur-3xl pointer-events-none" />

        {/* Close button */}
        {onClose && (
          <button
            onClick={onClose}
            aria-label={t('common.close')}
            className={cn(
              'absolute top-2 right-2 p-1.5 rounded-full transition-colors',
              'hover:bg-neo-cream/10 text-neo-white'
            )}
          >
            <X size={14} />
          </button>
        )}

        {/* Header with trophy */}
        <div className="flex items-center gap-3 mb-4">
          <m.div
            animate={{ rotate: [0, -10, 10, 0], scale: [1, 1.2, 1] }}
            transition={{ type: 'tween', duration: 1.5, repeat: Infinity, repeatDelay: 2 }}
          >
            <Trophy className="text-3xl text-neo-lime drop-shadow-lg" />
          </m.div>
          <div>
            <h3 className={cn(
              'text-xl font-black uppercase tracking-wide',
              'text-neo-white'
            )}>
              {isWinner
                ? t('results.victory')
                : t('results.wellPlayed')}
            </h3>
            <p className={cn(
              'text-sm font-bold italic',
              'text-neo-white'
            )}>
              &ldquo;{wittyMessage}&rdquo;
            </p>
          </div>
        </div>

        {/* Streak badge */}
        {streakDays > 0 && (
          <m.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold mb-4',
              streakDays >= 7
                ? 'bg-neo-pink/20 text-neo-pink border border-neo-pink/30'
                : 'bg-neo-lime/20 text-neo-lime border border-neo-lime/30'
            )}
          >
            <Flame className={streakDays >= 7 ? 'text-neo-pink' : 'text-neo-lime'} />
            {streakDays} {t('growth.dayStreak')}!
          </m.div>
        )}

        {/* Streak Encouragement - motivate sharing near milestones */}
        {streakEncouragement && (
          <m.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className={cn(
              'text-center py-2 px-4 rounded-neo border-2',
              'bg-neo-pink/20 border-neo-pink/40 text-neo-pink',
              'font-bold text-sm animate-pulse'
            )}
          >
            {streakEncouragement}
          </m.div>
        )}

        {/* Single Share CTA - tries native share first on mobile */}
        <m.button
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleShare}
          aria-label={t('results.shareYourVictory')}
          className={cn(
            'w-full flex items-center justify-center gap-2 px-4 py-4',
            'font-black text-lg uppercase tracking-wide rounded-neo',
            'border-4 border-neo-black shadow-hard-lg',
            'hover:shadow-hard-xl active:shadow-hard-sm',
            'transition-all duration-150',
            'bg-neo-lime text-neo-black',
            'focus:outline-hidden focus:ring-4 focus:ring-neo-cyan focus:ring-offset-2'
          )}
        >
          <Share2 size={18} />
          <span>{t('results.shareYourVictory')}</span>
        </m.button>

        {/* Viral prompt */}
        <p className={cn(
          'mt-3 text-center text-sm font-bold',
          'text-neo-white'
        )}>
          {t('results.challengeFriends')}
        </p>
      </m.div>
      </AnimatePresence>

      {/* Unified Share Modal */}
      <UnifiedShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        gameCode={gameCode}
        t={t}
        context="post-game"
        gameResult={gameResult}
        language={language}
        wittyMessage={wittyMessage}
      />
    </>
  );
};

export default ShareWinPrompt;
