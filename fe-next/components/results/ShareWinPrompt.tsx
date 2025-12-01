'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaWhatsapp, FaLink, FaShare, FaTrophy, FaFire, FaTimes } from 'react-icons/fa';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../utils/ThemeContext';
import { getJoinUrl, copyJoinUrl, shareViaWhatsApp } from '../../utils/share';
import { trackShare, getShareUrlWithTracking, generateReferralCode } from '../../utils/growthTracking';
import { cn } from '../../lib/utils';
import toast from 'react-hot-toast';

interface Achievement {
  id: string;
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
}

// Witty share messages - English
const WITTY_WINNER_MESSAGES_EN = {
  legendary: [ // score > 150
    "🔥 I just went NUCLEAR in LexiClash! {score} points. My brain is literally smoking.",
    "🔥 {score} points?! I didn't know I had this many brain cells. LexiClash brings out my inner genius.",
    "🔥 Just dropped {score} points like it's hot. Your move, smarty pants.",
    "🔥 Warning: I am dangerously good at finding words. {score} points. Come humble me (you can't).",
    "🔥 My dictionary called. It's scared. {score} points in LexiClash!",
  ],
  amazing: [ // score > 100
    "⚡ {score} points! Either I'm a genius or my opponents need coffee. Probably both.",
    "⚡ Just word-vomited my way to {score} points. Beautiful chaos.",
    "⚡ {score} points! I see letters in my sleep now. Send help. Or challengers.",
    "⚡ Vocabulary? Checked. Opponents? Wrecked. {score} points!",
    "⚡ {score} points! I'm not saying I'm the GOAT, but... BAAA 🐐",
  ],
  good: [ // score > 50
    "⭐ {score} points! Not too shabby for someone who types with two fingers.",
    "⭐ Scored {score} points! My 3rd grade spelling bee trophy is quaking.",
    "⭐ {score} points! Autocorrect could never.",
    "⭐ {score} points in LexiClash! My English teacher would finally be proud.",
    "⭐ Just flexed my vocabulary muscles. {score} points!",
  ],
  normal: [ // any score
    "🎮 {score} points! Come play and see if you can do better (spoiler: probably not).",
    "🎮 Just scored {score} in LexiClash! It's giving main character energy.",
    "🎮 {score} points! Not my best, not my worst, definitely my vibe.",
    "🎮 {score} points! The letters feared me today.",
  ],
};

const WITTY_LOSER_MESSAGES_EN = [
  "🎮 Just played LexiClash and honestly? I regret nothing. Come join the chaos!",
  "🎮 Lost at LexiClash but won at having fun. That counts, right? RIGHT?!",
  "🎮 I found {wordCount} words but my dignity? Still searching.",
  "🎮 My vocabulary took a vacation. {wordCount} words in LexiClash. I'll get 'em next time!",
  "🎮 Plot twist: I didn't win. But I DID have fun finding {wordCount} words!",
];

// Witty share messages - Hebrew
const WITTY_WINNER_MESSAGES_HE = {
  legendary: [
    "🔥 {score} נקודות?! המוח שלי עדיין בוער. LexiClash הפך אותי לגאון.",
    "🔥 פשוט הרסתי את LexiClash עם {score} נקודות. מישהו להעז?",
    "🔥 {score} נקודות! המילון התקשר, הוא פוחד ממני.",
    "🔥 אזהרה: אני מסוכנת/ן במציאת מילים. {score} נקודות!",
  ],
  amazing: [
    "⚡ {score} נקודות! או שאני גאון או שהיריבים צריכים קפה.",
    "⚡ {score} נקודות! אני רואה אותיות בחלומות עכשיו. שלחו עזרה.",
    "⚡ אוצר מילים? יש. יריבים? מרוסקים. {score} נקודות!",
    "⚡ {score} נקודות! לא אומר/ת שאני הכי טוב/ה, אבל... 🐐",
  ],
  good: [
    "⭐ {score} נקודות! לא רע בכלל למי שמקליד עם שתי אצבעות.",
    "⭐ {score} נקודות! המורה לעברית סוף סוף תהיה גאה.",
    "⭐ שריר אוצר המילים שלי עבד היום. {score} נקודות!",
  ],
  normal: [
    "🎮 {score} נקודות! בואו תנסו לעשות יותר טוב (ספוילר: כנראה לא).",
    "🎮 {score} נקודות! האותיות פחדו ממני היום.",
  ],
};

const WITTY_LOSER_MESSAGES_HE = [
  "🎮 שיחקתי LexiClash ובכנות? לא מתחרט/ת על כלום. בואו לכאוס!",
  "🎮 הפסדתי אבל נהניתי. זה נחשב, נכון? נכון?!",
  "🎮 מצאתי {wordCount} מילים אבל הכבוד שלי? עדיין מחפש/ת.",
  "🎮 אוצר המילים שלי יצא לחופש. בפעם הבאה אני מנצח/ת!",
];

// Witty viral prompts to display below the share buttons
const VIRAL_PROMPTS_EN = [
  "Challenge your friends... if they dare 😈",
  "Warning: May cause intense vocabulary envy",
  "Show them who the real wordsmith is 💪",
  "Make your friends question their education",
  "Friendship-ending scores await!",
  "Let's see who actually paid attention in English class",
  "Time to find out who the smart friend is",
];

const VIRAL_PROMPTS_HE = [
  "תאתגרו את החברים... אם הם מעזים 😈",
  "אזהרה: עלול לגרום לקנאה חריפה",
  "הראו להם מי הבוס של המילים 💪",
  "בואו נראה מי באמת הקשיב בשיעור",
  "הזמינו את החברים לאבד בכבוד",
];

// Helper to pick random item from array
const pickRandom = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

const ShareWinPrompt: React.FC<ShareWinPromptProps> = ({
  isWinner,
  username,
  score,
  wordCount,
  achievements = [],
  gameCode,
  streakDays = 0,
  onClose,
  compact = false,
}) => {
  const { t, language } = useLanguage();
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const [isExpanded, setIsExpanded] = useState(!compact);
  const [copied, setCopied] = useState(false);

  // Generate witty personalized share message
  const shareMessage = useMemo(() => {
    const referralCode = generateReferralCode();
    const url = getShareUrlWithTracking(gameCode, referralCode);

    // Achievement icons (max 3)
    const achievementIcons = achievements
      .slice(0, 3)
      .map(a => a.icon || '🏆')
      .join('');

    // Streak text
    const streakText = streakDays && streakDays > 1
      ? language === 'he'
        ? `\n🔥 רצף של ${streakDays} ימים!`
        : `\n🔥 ${streakDays} day streak - I'm on FIRE!`
      : '';

    // Pick witty message based on score tier and winner status
    const isHebrew = language === 'he';
    let baseMessage: string;

    if (isWinner) {
      const messages = isHebrew ? WITTY_WINNER_MESSAGES_HE : WITTY_WINNER_MESSAGES_EN;
      if (score > 150) {
        baseMessage = pickRandom(messages.legendary);
      } else if (score > 100) {
        baseMessage = pickRandom(messages.amazing);
      } else if (score > 50) {
        baseMessage = pickRandom(messages.good);
      } else {
        baseMessage = pickRandom(messages.normal);
      }
    } else {
      baseMessage = pickRandom(isHebrew ? WITTY_LOSER_MESSAGES_HE : WITTY_LOSER_MESSAGES_EN);
    }

    // Replace placeholders
    baseMessage = baseMessage
      .replace('{score}', String(score))
      .replace('{wordCount}', String(wordCount));

    // Add achievements and word count info
    const statsLine = isHebrew
      ? `\n${wordCount} מילים${achievementIcons ? ` ${achievementIcons}` : ''}`
      : `\n${wordCount} words found${achievementIcons ? ` ${achievementIcons}` : ''}`;

    // Compose final message
    return `${baseMessage}${isWinner ? statsLine : ''}${streakText}\n\n${url}`;
  }, [isWinner, score, wordCount, achievements, gameCode, language, streakDays]);

  // Random viral prompt
  const viralPrompt = useMemo(() => {
    return pickRandom(language === 'he' ? VIRAL_PROMPTS_HE : VIRAL_PROMPTS_EN);
  }, [language]);

  // Handle WhatsApp share
  const handleWhatsAppShare = () => {
    trackShare('whatsapp', gameCode);

    const referralCode = generateReferralCode();
    const url = getShareUrlWithTracking(gameCode, referralCode);
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareMessage)}`;
    window.open(whatsappUrl, '_blank');
  };

  // Handle copy link
  const handleCopyLink = async () => {
    trackShare('copy', gameCode);

    const referralCode = generateReferralCode();
    const url = getShareUrlWithTracking(gameCode, referralCode);

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success(t('share.linkCopied'), { icon: '📋' });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t('share.copyError'));
    }
  };

  // Handle native share (if available)
  const handleNativeShare = async () => {
    if (navigator.share) {
      trackShare('native', gameCode);

      try {
        await navigator.share({
          title: 'LexiClash',
          text: shareMessage,
          url: getShareUrlWithTracking(gameCode, generateReferralCode()),
        });
      } catch {
        // User cancelled or error
      }
    } else {
      handleCopyLink();
    }
  };

  // Don't show for non-winners unless they have a good score
  if (!isWinner && score < 30) return null;

  // Compact inline version - just share buttons with witty prompt
  if (compact && !isExpanded) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          'flex flex-col sm:flex-row items-center justify-center gap-3 p-4 rounded-xl border-2',
          isDarkMode
            ? 'bg-slate-800/60 border-cyan-400/30 shadow-[3px_3px_0px_rgba(34,211,238,0.2)]'
            : 'bg-gradient-to-r from-cyan-50 to-blue-50 border-cyan-300 shadow-[3px_3px_0px_rgba(34,211,238,0.3)]'
        )}
      >
        <span className={cn('text-sm font-bold', isDarkMode ? 'text-cyan-300' : 'text-cyan-700')}>
          {language === 'he' ? 'הזמינו חברים לקרב! 🎯' : 'Recruit challengers! 🎯'}
        </span>
        <div className="flex gap-2">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleWhatsAppShare}
            className="flex items-center gap-1.5 px-3 py-2 bg-[#25D366] hover:bg-[#1ebe5d] text-white text-sm font-bold rounded-lg border-2 border-[#1a9e4a] shadow-[2px_2px_0px_#1a9e4a] transition-all"
          >
            <FaWhatsapp size={14} />
            <span className="hidden sm:inline">{language === 'he' ? 'וואטסאפ' : 'WhatsApp'}</span>
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleCopyLink}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 text-sm font-bold rounded-lg border-2 transition-all',
              copied
                ? 'bg-green-500 text-white border-green-700 shadow-[2px_2px_0px_#15803d]'
                : isDarkMode
                ? 'bg-slate-700 hover:bg-slate-600 text-white border-slate-500 shadow-[2px_2px_0px_#475569]'
                : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-400 shadow-[2px_2px_0px_#9ca3af]'
            )}
          >
            <FaLink size={12} />
            <span className="hidden sm:inline">{copied ? '✓' : (language === 'he' ? 'לינק' : 'Link')}</span>
          </motion.button>
        </div>
      </motion.div>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.95 }}
        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
        className={cn(
          'relative p-4 sm:p-5 rounded-2xl border-3 overflow-hidden',
          isWinner
            ? isDarkMode
              ? 'bg-gradient-to-br from-yellow-900/30 via-amber-900/20 to-orange-900/30 border-yellow-400/60 shadow-[4px_4px_0px_rgba(250,204,21,0.4)]'
              : 'bg-gradient-to-br from-yellow-50 via-amber-50 to-orange-50 border-yellow-400 shadow-[4px_4px_0px_rgba(250,204,21,0.5)]'
            : isDarkMode
            ? 'bg-gradient-to-br from-cyan-900/30 via-blue-900/20 to-indigo-900/30 border-cyan-400/50 shadow-[4px_4px_0px_rgba(34,211,238,0.3)]'
            : 'bg-gradient-to-br from-cyan-50 via-blue-50 to-indigo-50 border-cyan-400 shadow-[4px_4px_0px_rgba(34,211,238,0.4)]'
        )}
      >
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-white/15 to-transparent rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-white/10 to-transparent rounded-full blur-2xl pointer-events-none" />

        {/* Close button */}
        {onClose && (
          <button
            onClick={onClose}
            className={cn(
              'absolute top-2 right-2 p-1.5 rounded-full transition-colors',
              isDarkMode ? 'hover:bg-white/10 text-gray-400' : 'hover:bg-black/5 text-gray-500'
            )}
          >
            <FaTimes size={14} />
          </button>
        )}

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <motion.div
            animate={{ rotate: [0, -10, 10, 0], scale: [1, 1.2, 1] }}
            transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 2 }}
            className="relative"
          >
            {isWinner ? (
              <FaTrophy className="text-3xl text-yellow-400 drop-shadow-[0_0_12px_rgba(250,204,21,0.7)]" />
            ) : (
              <FaShare className="text-2xl text-blue-400" />
            )}
          </motion.div>
          <div>
            <h3
              className={cn(
                'text-xl font-black uppercase tracking-wide',
                isDarkMode ? 'text-white' : 'text-gray-900'
              )}
            >
              {isWinner
                ? language === 'he' ? 'שתפו את הניצחון! 🎉' : 'FLEX YOUR WIN! 🎉'
                : language === 'he' ? 'שתפו את המשחק!' : 'SHARE THE FUN!'}
            </h3>
            <p className={cn('text-sm font-medium', isDarkMode ? 'text-gray-300' : 'text-gray-600')}>
              {isWinner
                ? language === 'he' ? 'הראו לחברים מי הבוס' : 'Make your friends jealous'
                : language === 'he' ? 'הזמינו חברים למשחק' : 'Get your crew in here'}
            </p>
          </div>
        </div>

        {/* Streak badge (if applicable) */}
        {streakDays > 0 && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium mb-4',
              streakDays >= 7
                ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
            )}
          >
            <FaFire className={streakDays >= 7 ? 'text-orange-500' : 'text-yellow-500'} />
            {streakDays} {t('growth.dayStreak') || 'day streak'}!
          </motion.div>
        )}

        {/* Stats preview */}
        <div
          className={cn(
            'flex items-center justify-center gap-4 mb-4 p-3 rounded-xl border-2',
            isDarkMode
              ? 'bg-black/30 border-white/10'
              : 'bg-white/60 border-gray-200'
          )}
        >
          <div className="text-center px-3">
            <div className={cn('text-2xl font-black', isDarkMode ? 'text-yellow-400' : 'text-yellow-600')}>
              {score}
            </div>
            <div className={cn('text-xs font-bold uppercase tracking-wide', isDarkMode ? 'text-gray-400' : 'text-gray-500')}>
              {language === 'he' ? 'נקודות' : 'pts'}
            </div>
          </div>
          <div className={cn('w-0.5 h-10 rounded-full', isDarkMode ? 'bg-white/20' : 'bg-gray-300')} />
          <div className="text-center px-3">
            <div className={cn('text-2xl font-black', isDarkMode ? 'text-cyan-400' : 'text-cyan-600')}>
              {wordCount}
            </div>
            <div className={cn('text-xs font-bold uppercase tracking-wide', isDarkMode ? 'text-gray-400' : 'text-gray-500')}>
              {language === 'he' ? 'מילים' : 'words'}
            </div>
          </div>
          {achievements.length > 0 && (
            <>
              <div className={cn('w-0.5 h-10 rounded-full', isDarkMode ? 'bg-white/20' : 'bg-gray-300')} />
              <div className="text-center px-3">
                <div className="text-2xl">{achievements.slice(0, 3).map(a => a.icon || '🏆').join('')}</div>
                <div className={cn('text-xs font-bold uppercase tracking-wide', isDarkMode ? 'text-gray-400' : 'text-gray-500')}>
                  {achievements.length} {language === 'he' ? 'הישגים' : 'badges'}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Share buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <motion.button
            whileHover={{ scale: 1.03, y: -2 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleWhatsAppShare}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-[#25D366] hover:bg-[#1ebe5d] text-white font-black text-sm uppercase tracking-wide rounded-xl border-2 border-[#1a9e4a] shadow-[3px_3px_0px_#1a9e4a] hover:shadow-[1px_1px_0px_#1a9e4a] transition-all duration-150"
          >
            <FaWhatsapp size={20} />
            <span>{language === 'he' ? 'שתפו בוואטסאפ' : 'Send on WhatsApp'}</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.03, y: -2 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleCopyLink}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 px-4 py-3 font-black text-sm uppercase tracking-wide rounded-xl border-2 transition-all duration-150',
              copied
                ? 'bg-green-500 text-white border-green-700 shadow-[3px_3px_0px_#15803d]'
                : isDarkMode
                ? 'bg-slate-700 hover:bg-slate-600 text-white border-slate-500 shadow-[3px_3px_0px_#475569] hover:shadow-[1px_1px_0px_#475569]'
                : 'bg-white hover:bg-gray-50 text-gray-800 border-gray-400 shadow-[3px_3px_0px_#9ca3af] hover:shadow-[1px_1px_0px_#9ca3af]'
            )}
          >
            <FaLink size={16} />
            <span>{copied ? (language === 'he' ? 'הועתק!' : 'Copied!') : (language === 'he' ? 'העתק לינק' : 'Copy Link')}</span>
          </motion.button>

          {/* Native share button (mobile) */}
          {typeof navigator !== 'undefined' && navigator.share && (
            <motion.button
              whileHover={{ scale: 1.03, y: -2 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleNativeShare}
              className={cn(
                'sm:hidden flex items-center justify-center gap-2 px-4 py-3 font-black text-sm uppercase tracking-wide rounded-xl border-2 transition-all duration-150',
                isDarkMode
                  ? 'bg-blue-600 hover:bg-blue-500 text-white border-blue-800 shadow-[3px_3px_0px_#1e40af]'
                  : 'bg-blue-500 hover:bg-blue-400 text-white border-blue-700 shadow-[3px_3px_0px_#1d4ed8]'
              )}
            >
              <FaShare size={16} />
              <span>{language === 'he' ? 'שתף' : 'Share'}</span>
            </motion.button>
          )}
        </div>

        {/* Witty viral prompt */}
        <p
          className={cn(
            'mt-3 text-center text-sm font-medium italic',
            isDarkMode ? 'text-gray-300' : 'text-gray-600'
          )}
        >
          {viralPrompt}
        </p>
      </motion.div>
    </AnimatePresence>
  );
};

export default ShareWinPrompt;
