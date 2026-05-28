'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { fireConfetti } from '@/utils/confettiUtils';
import { Share } from 'lucide-react';
import { Mascot } from '@/components/ui/Mascot';
import { useLanguage } from '../../contexts/LanguageContext';
import { SPRING_PRESETS } from '@/lib/animation/presets';
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
  const { t, language, dir } = useLanguage();
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

    const shareText = `🏆 ${t('achievements.shareText', { name: achievementName })}`;

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
        description: t(`achievements.${achievement.key}.description`)
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

  // RTL-aware animation: slide from left in RTL, from right in LTR
  const slideDirection = dir === 'rtl' ? -300 : 300;

  return (
    <AnimatePresence>
      <m.div
        initial={{ x: slideDirection, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: slideDirection, opacity: 0 }}
        transition={{
          type: 'spring',
          stiffness: 300,
          damping: 25,
        }}
        className="fixed top-20 inset-e-4 z-60 w-80 max-w-[calc(100vw-2rem)]"
        onClick={onComplete}
      >
        {/* Compact toast container - Neo-Brutalist */}
        <div className="relative overflow-hidden rounded-lg bg-neo-pink text-white border-3 border-neo-black shadow-hard-lg cursor-pointer hover:scale-[1.02] transition-transform">
          {/* Content */}
          <div className="p-3">
            <div className="flex items-center gap-3">
              {/* Compact icon */}
              <m.div
                initial={{ scale: 0.95, rotate: -90 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.1, type: 'spring', stiffness: 400, damping: 15 }}
              >
                <div className="relative shrink-0">
                  <div className="w-10 h-10 bg-neo-cyan text-neo-black border-2 border-neo-black shadow-hard rounded-md flex items-center justify-center">
                    <span className="text-xl">
                      {localizedAchievement.icon}
                    </span>
                  </div>
                  <div className="absolute -bottom-1 -right-1">
                    <Mascot variant="trophy" size="xs" animated={false} clipBorder="none" />
                  </div>
                </div>
              </m.div>

              {/* Text content - more compact */}
              <div className="flex-1 min-w-0">
                <m.h3
                  initial={{ x: 10, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.15, ...SPRING_PRESETS.balanced }}
                  className="text-sm font-black uppercase text-neo-lime truncate"
                >
                  {localizedAchievement.name}
                </m.h3>
                <m.p
                  initial={{ x: 10, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.2, ...SPRING_PRESETS.balanced }}
                  className="text-xs font-bold text-neo-white line-clamp-1"
                >
                  {localizedAchievement.description}
                </m.p>
              </div>

              {/* Action buttons */}
              <m.div
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3, type: 'spring', stiffness: 400, damping: 22 }}
                className="shrink-0 flex gap-1.5"
              >
                {/* Share button */}
                <button
                  onClick={handleShare}
                  className="relative w-6 h-6 bg-neo-cyan border-2 border-neo-black rounded flex items-center justify-center text-xs font-black hover:bg-neo-lime transition-colors"
                  title={t('achievements.shareButton')}
                >
                  <Share size={10} />
                  {showShareHint && (
                    <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] whitespace-nowrap bg-neo-black text-neo-white px-1.5 py-0.5 rounded">
                      {t('achievements.copied')}
                    </span>
                  )}
                </button>
                {/* Close button */}
                <div className="w-6 h-6 bg-neo-pink border-2 border-neo-black rounded flex items-center justify-center text-xs font-black cursor-pointer hover:bg-neo-red transition-colors">
                  ✕
                </div>
              </m.div>
            </div>

            {/* Compact progress bar */}
            <m.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 0.25 }}
              className="mt-2 h-1.5 bg-neo-navy-light border border-neo-black rounded-sm overflow-hidden"
              style={{ transformOrigin: 'left' }}
            >
              <m.div
                className="h-full bg-neo-lime"
                style={{ width: `${progress}%` }}
              />
            </m.div>
          </div>
        </div>
      </m.div>
    </AnimatePresence>
  );
};

export default AchievementPopup;
