'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { fireConfetti } from '@/utils/confettiUtils';
import { Share } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useSoundEffects } from '../../contexts/SoundEffectsContext';
import { getAchievementShareUrl, shareWithOgImage } from '../../utils/ogShare';
import { gameEvents } from '../GoogleAnalytics';
import type { AchievementPayload } from '@/shared/types/socket';

interface LocalizedAchievement {
  icon: string;
  name: string;
  description: string;
}

interface LegacyAchievement {
  icon: string;
  name: string;
  description: string;
}

type Achievement = AchievementPayload | LegacyAchievement;

interface AchievementPopupProps {
  achievement: Achievement;
  onComplete?: () => void;
}

/**
 * Neo-Brutalist Achievement Popup
 * Features: Thick borders, hard shadows, bold uppercase text, vibrant colors
 */
const AchievementPopup = ({ achievement, onComplete }: AchievementPopupProps): React.ReactElement | null => {
  const { t, language } = useLanguage();
  const { playAchievementSound } = useSoundEffects();
  const [progress, setProgress] = useState<number>(0);
  const [showShareHint, setShowShareHint] = useState(false);
  const displayDuration = 3000; // 3 seconds

  // Handle share button click
  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent closing the popup

    const achievementKey = 'key' in achievement ? achievement.key : achievement.name;
    const achievementName = 'key' in achievement
      ? t(`achievements.${achievement.key}.name`) || achievement.key
      : achievement.name;

    // Track the share
    gameEvents.achievementUnlock(achievementKey);
    gameEvents.share('social', 'achievement');

    // Generate share URL with OG image
    const ogImageUrl = getAchievementShareUrl(achievementKey, language);

    const shareText = language === 'he'
      ? `🏆 פתחתי את ההישג "${achievementName}" ב-LexiClash! בוא לשחק גם!`
      : `🏆 I just unlocked "${achievementName}" in LexiClash! Come play!`;

    const shared = await shareWithOgImage({
      title: `LexiClash - ${achievementName}`,
      text: shareText,
      url: typeof window !== 'undefined' ? window.location.origin : 'https://www.lexiclash.live',
      imageUrl: ogImageUrl,
    });

    if (!shared && typeof navigator !== 'undefined' && navigator.clipboard) {
      // Fallback to copying link
      await navigator.clipboard.writeText(
        `${shareText}\n\n${typeof window !== 'undefined' ? window.location.origin : 'https://www.lexiclash.live'}`
      );
      setShowShareHint(true);
      setTimeout(() => setShowShareHint(false), 2000);
    }
  };

  // Localize achievement using player's language
  // Achievement can have either { key, icon } (unlocalized) or { name, description, icon } (legacy localized)
  const localizedAchievement = useMemo((): LocalizedAchievement | null => {
    if (!achievement) return null;

    // If achievement has a key, localize it using the player's language
    if ('key' in achievement) {
      return {
        icon: achievement.icon,
        name: t(`achievements.${achievement.key}.name`) || achievement.key,
        description: t(`achievements.${achievement.key}.description`) || ''
      };
    }

    // Legacy format: already has name and description (backwards compatibility)
    return achievement;
  }, [achievement, t]);

  useEffect(() => {
    if (!achievement) return;

    // Play sound
    playAchievementSound();

    // Fire confetti with Neo-Brutalist colors (smaller burst)
    fireConfetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.2 },
      colors: ['#FFE135', '#FF6B35', '#FF1493', '#00FFFF', '#BFFF00'],
    });

    // Animate progress bar
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const newProgress = Math.min((elapsed / displayDuration) * 100, 100);
      setProgress(newProgress);

      if (elapsed >= displayDuration) {
        clearInterval(interval);
        onComplete?.();
      }
    }, 50);

    return () => clearInterval(interval);
  }, [achievement, onComplete, playAchievementSound]);

  if (!localizedAchievement) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ x: 300, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 300, opacity: 0 }}
        transition={{
          type: 'spring',
          stiffness: 300,
          damping: 25,
        }}
        className="fixed top-20 right-4 z-[9999] w-80 max-w-[calc(100vw-2rem)]"
        onClick={onComplete}
      >
        {/* Compact toast container - Neo-Brutalist */}
        <div className="relative overflow-hidden rounded-lg bg-neo-pink text-white border-3 border-neo-black shadow-hard-lg cursor-pointer hover:scale-[1.02] transition-transform">
          {/* Content */}
          <div className="p-3">
            <div className="flex items-center gap-3">
              {/* Compact icon */}
              <motion.div
                initial={{ scale: 0, rotate: -90 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.1, type: 'spring', stiffness: 400, damping: 15 }}
              >
                <div className="w-10 h-10 bg-neo-cyan text-neo-black border-2 border-neo-black shadow-hard rounded-md flex items-center justify-center flex-shrink-0">
                  <span className="text-xl">
                    {localizedAchievement.icon}
                  </span>
                </div>
              </motion.div>

              {/* Text content - more compact */}
              <div className="flex-1 min-w-0">
                <motion.h3
                  initial={{ x: 10, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.15 }}
                  className="text-sm font-black uppercase text-neo-lime truncate"
                >
                  {localizedAchievement.name}
                </motion.h3>
                <motion.p
                  initial={{ x: 10, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="text-xs font-bold text-neo-white/90 line-clamp-1"
                >
                  {localizedAchievement.description}
                </motion.p>
              </div>

              {/* Action buttons */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3 }}
                className="flex-shrink-0 flex gap-1.5"
              >
                {/* Share button */}
                <button
                  onClick={handleShare}
                  className="relative w-6 h-6 bg-neo-cyan border-2 border-neo-black rounded flex items-center justify-center text-xs font-black hover:bg-neo-lime transition-colors"
                  title={language === 'he' ? 'שתף' : 'Share'}
                >
                  <Share size={10} />
                  {showShareHint && (
                    <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] whitespace-nowrap bg-neo-black text-neo-white px-1.5 py-0.5 rounded">
                      {language === 'he' ? 'הועתק!' : 'Copied!'}
                    </span>
                  )}
                </button>
                {/* Close button */}
                <div className="w-6 h-6 bg-neo-pink border-2 border-neo-black rounded flex items-center justify-center text-xs font-black cursor-pointer hover:bg-neo-red transition-colors">
                  ✕
                </div>
              </motion.div>
            </div>

            {/* Compact progress bar */}
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 0.25 }}
              className="mt-2 h-1.5 bg-neo-navy-light border border-neo-black rounded-sm overflow-hidden"
              style={{ transformOrigin: 'left' }}
            >
              <motion.div
                className="h-full bg-neo-lime"
                style={{ width: `${progress}%` }}
              />
            </motion.div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default AchievementPopup;
