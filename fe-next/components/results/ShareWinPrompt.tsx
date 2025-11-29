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

  // Generate personalized share message based on performance
  const shareMessage = useMemo(() => {
    const referralCode = generateReferralCode();
    const url = getShareUrlWithTracking(gameCode, referralCode);

    // Score-based emoji
    const scoreEmoji = score > 150 ? '🔥' : score > 100 ? '⚡' : score > 50 ? '⭐' : '🎮';

    // Achievement icons (max 3)
    const achievementIcons = achievements
      .slice(0, 3)
      .map(a => a.icon || '🏆')
      .join('');

    // Build message based on language and performance
    if (language === 'he') {
      if (isWinner) {
        if (score > 100) {
          return `${scoreEmoji} ניצחתי ב-LexiClash עם ${score} נקודות! ${achievementIcons}\nמצאתי ${wordCount} מילים. מי יכול לנצח אותי?\n\n${url}`;
        }
        return `🏆 ניצחתי ב-LexiClash!\nמצאתי ${wordCount} מילים וצברתי ${score} נקודות.\nבואו לשחק: ${url}`;
      }
      return `🎮 שיחקתי ב-LexiClash ומצאתי ${wordCount} מילים!\nבואו לשחק איתי: ${url}`;
    }

    // English (default)
    if (isWinner) {
      if (score > 100 && achievements.length > 0) {
        return `${scoreEmoji} Just crushed it in LexiClash with ${score} points! ${achievementIcons}\nFound ${wordCount} words. Think you can beat me?\n\n${url}`;
      }
      if (score > 100) {
        return `${scoreEmoji} Just scored ${score} points in LexiClash!\n${wordCount} words found. Can you beat my score?\n\n${url}`;
      }
      return `🏆 Won at LexiClash!\nFound ${wordCount} words and scored ${score} points.\nJoin me: ${url}`;
    }

    return `🎮 Just played LexiClash and found ${wordCount} words!\nJoin my game: ${url}`;
  }, [isWinner, score, wordCount, achievements, gameCode, language]);

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

  // Compact inline version - just share buttons, no stats
  if (compact && !isExpanded) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={cn(
          'flex items-center justify-center gap-3 p-3 rounded-xl',
          isDarkMode
            ? 'bg-slate-800/50 border border-slate-700/50'
            : 'bg-slate-50 border border-slate-200'
        )}
      >
        <span className={cn('text-sm', isDarkMode ? 'text-gray-400' : 'text-gray-500')}>
          {t('growth.inviteFriendsToPlay') || 'Invite friends to play'}
        </span>
        <button
          onClick={handleWhatsAppShare}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#25D366] hover:bg-[#20BD5A] text-white text-sm font-medium rounded-lg transition-colors"
        >
          <FaWhatsapp size={14} />
          <span className="hidden sm:inline">{t('share.whatsappButton') || 'WhatsApp'}</span>
        </button>
        <button
          onClick={handleCopyLink}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors',
            copied
              ? 'bg-green-500 text-white'
              : isDarkMode
              ? 'bg-slate-700 hover:bg-slate-600 text-white'
              : 'bg-slate-200 hover:bg-slate-300 text-gray-700'
          )}
        >
          <FaLink size={12} />
          <span className="hidden sm:inline">{copied ? 'Copied!' : t('share.copyLinkButton') || 'Copy'}</span>
        </button>
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
          'relative p-4 sm:p-5 rounded-xl border-2 overflow-hidden',
          isWinner
            ? isDarkMode
              ? 'bg-gradient-to-br from-green-900/40 via-emerald-900/30 to-teal-900/40 border-green-500/40'
              : 'bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 border-green-300'
            : isDarkMode
            ? 'bg-gradient-to-br from-blue-900/30 via-indigo-900/30 to-purple-900/30 border-blue-500/30'
            : 'bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 border-blue-200'
        )}
      >
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-white/10 to-transparent rounded-full blur-2xl pointer-events-none" />

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
            animate={{ rotate: [0, -10, 10, 0], scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
          >
            {isWinner ? (
              <FaTrophy className="text-2xl text-yellow-500 drop-shadow-[0_0_8px_rgba(234,179,8,0.5)]" />
            ) : (
              <FaShare className="text-2xl text-blue-500" />
            )}
          </motion.div>
          <div>
            <h3
              className={cn(
                'text-lg font-bold',
                isDarkMode ? 'text-white' : 'text-gray-900'
              )}
            >
              {isWinner
                ? t('growth.shareVictory') || '🎉 Share Your Victory!'
                : t('growth.shareResult') || 'Share Your Game'}
            </h3>
            <p className={cn('text-sm', isDarkMode ? 'text-gray-300' : 'text-gray-600')}>
              {isWinner
                ? t('growth.bragToFriends') || 'Let your friends know you won!'
                : t('growth.inviteFriendsToPlay') || 'Invite friends to challenge you'}
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
            'flex items-center gap-4 mb-4 p-3 rounded-lg',
            isDarkMode ? 'bg-black/20' : 'bg-white/50'
          )}
        >
          <div className="text-center">
            <div className={cn('text-xl font-bold', isDarkMode ? 'text-white' : 'text-gray-900')}>
              {score}
            </div>
            <div className={cn('text-xs', isDarkMode ? 'text-gray-400' : 'text-gray-500')}>
              {t('results.points') || 'points'}
            </div>
          </div>
          <div className="w-px h-8 bg-gray-500/30" />
          <div className="text-center">
            <div className={cn('text-xl font-bold', isDarkMode ? 'text-white' : 'text-gray-900')}>
              {wordCount}
            </div>
            <div className={cn('text-xs', isDarkMode ? 'text-gray-400' : 'text-gray-500')}>
              {t('playerView.wordsFound') || 'words'}
            </div>
          </div>
          {achievements.length > 0 && (
            <>
              <div className="w-px h-8 bg-gray-500/30" />
              <div className="text-center">
                <div className="text-xl">{achievements.slice(0, 3).map(a => a.icon || '🏆').join('')}</div>
                <div className={cn('text-xs', isDarkMode ? 'text-gray-400' : 'text-gray-500')}>
                  {achievements.length} {t('hostView.achievements') || 'achievements'}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Share buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleWhatsAppShare}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-[#25D366] hover:bg-[#20BD5A] text-white font-bold rounded-xl transition-colors shadow-lg shadow-green-500/20"
          >
            <FaWhatsapp size={20} />
            <span>{t('share.whatsappButton') || 'Share on WhatsApp'}</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleCopyLink}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 px-4 py-3 font-bold rounded-xl transition-colors',
              copied
                ? 'bg-green-500 text-white'
                : isDarkMode
                ? 'bg-gray-700 hover:bg-gray-600 text-white'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
            )}
          >
            <FaLink size={16} />
            <span>{copied ? t('share.linkCopied') || 'Copied!' : t('share.copyLinkButton') || 'Copy Link'}</span>
          </motion.button>

          {/* Native share button (mobile) */}
          {typeof navigator !== 'undefined' && navigator.share && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleNativeShare}
              className={cn(
                'sm:hidden flex items-center justify-center gap-2 px-4 py-3 font-bold rounded-xl transition-colors',
                isDarkMode
                  ? 'bg-blue-600 hover:bg-blue-500 text-white'
                  : 'bg-blue-500 hover:bg-blue-600 text-white'
              )}
            >
              <FaShare size={16} />
              <span>{t('growth.share') || 'Share'}</span>
            </motion.button>
          )}
        </div>

        {/* Viral prompt */}
        <p
          className={cn(
            'mt-3 text-center text-xs',
            isDarkMode ? 'text-gray-400' : 'text-gray-500'
          )}
        >
          {t('growth.viralPrompt') || 'Challenge your friends to beat your score!'}
        </p>
      </motion.div>
    </AnimatePresence>
  );
};

export default ShareWinPrompt;
