'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Sparkles, Zap, Users } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { gameEvents } from '@/components/GoogleAnalytics';
import { useRouter } from 'next/navigation';

interface NextChallengePromptProps {
  /** Which challenge was just completed */
  completedChallenge: 'word_hunt' | 'buzz';
  /** Current locale for routing */
  locale: string;
}

/**
 * Next Challenge Prompt Component
 *
 * Smart engagement flow that suggests the next activity after completing a daily challenge:
 * 1. Completed Word Hunt → Suggest Daily Buzz (if not done today)
 * 2. Completed Buzz → Suggest Word Hunt (if not done today)
 * 3. Completed both → Suggest Multiplayer or Bot game
 *
 * Features:
 * - Checks localStorage for today's completion status
 * - Neo-brutalist design with animated CTA
 * - i18n support
 * - GA4 tracking for cross-challenge engagement
 */
export function NextChallengePrompt({ completedChallenge, locale }: NextChallengePromptProps) {
  const { t } = useLanguage();
  const router = useRouter();
  const [nextAction, setNextAction] = useState<'word_hunt' | 'buzz' | 'multiplayer' | null>(null);

  useEffect(() => {
    // Check what the user has completed today
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

    const wordHuntCompleted = localStorage.getItem('daily_word_hunt_completed') === today;
    const buzzCompleted = localStorage.getItem('daily_buzz_completed') === today;

    // Determine next action based on completion status
    if (completedChallenge === 'word_hunt' && !buzzCompleted) {
      setNextAction('buzz');
    } else if (completedChallenge === 'buzz' && !wordHuntCompleted) {
      setNextAction('word_hunt');
    } else if (wordHuntCompleted && buzzCompleted) {
      // Both completed - suggest multiplayer
      setNextAction('multiplayer');
    } else {
      // User just completed the only remaining daily challenge, suggest multiplayer
      setNextAction('multiplayer');
    }
  }, [completedChallenge]);

  const handleCTAClick = () => {
    if (!nextAction) return;

    // Track engagement in GA4
    gameEvents.trackEvent('next_challenge_click', {
      from_challenge: completedChallenge,
      to_action: nextAction,
    });

    // Navigate to appropriate page
    switch (nextAction) {
      case 'word_hunt':
        router.push(`/${locale}/daily`);
        break;
      case 'buzz':
        router.push(`/${locale}/daily`);
        break;
      case 'multiplayer':
        router.push(`/${locale}/multiplayer`);
        break;
    }
  };

  if (!nextAction) return null;

  // Get copy based on next action
  const getCopy = () => {
    switch (nextAction) {
      case 'word_hunt':
        return {
          icon: <Zap size={24} className="text-neo-cyan" />,
          title: t('daily.nextChallenge.wordHuntTitle') || '⚡ Daily Word Hunt Awaits!',
          description: t('daily.nextChallenge.wordHuntDesc') || 'Test your speed! Find the target word as fast as you can.',
          cta: t('daily.nextChallenge.wordHuntCTA') || 'Play Word Hunt',
          bgColor: 'bg-neo-cyan',
          textColor: 'text-neo-cyan',
        };
      case 'buzz':
        return {
          icon: <Sparkles size={24} className="text-neo-pink" />,
          title: t('daily.nextChallenge.buzzTitle') || '🔥 Daily Buzz Challenge!',
          description: t('daily.nextChallenge.buzzDesc') || 'Trending topics! Solve AI-generated word puzzles.',
          cta: t('daily.nextChallenge.buzzCTA') || 'Try Daily Buzz',
          bgColor: 'bg-neo-pink',
          textColor: 'text-neo-pink',
        };
      case 'multiplayer':
        return {
          icon: <Users size={24} className="text-neo-lime" />,
          title: t('daily.nextChallenge.multiplayerTitle') || '🎮 Ready for More?',
          description: t('daily.nextChallenge.multiplayerDesc') || 'Challenge friends or battle bots in real-time!',
          cta: t('daily.nextChallenge.multiplayerCTA') || 'Play Multiplayer',
          bgColor: 'bg-neo-lime',
          textColor: 'text-neo-lime',
        };
    }
  };

  const copy = getCopy();

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ delay: 0.5, duration: 0.4, type: 'spring', damping: 20 }}
        className="w-full mt-6"
      >
        <div className={`${copy.bgColor} border-3 border-neo-black rounded-neo shadow-hard-lg p-6 relative overflow-hidden`}>
          {/* Animated background pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 left-0 w-32 h-32 bg-neo-black rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-0 right-0 w-40 h-40 bg-neo-black rounded-full blur-3xl animate-pulse delay-700" />
          </div>

          {/* Content */}
          <div className="relative z-10">
            <div className="flex items-start gap-4 mb-4">
              {/* Icon */}
              <div className="p-3 bg-neo-white border-3 border-neo-black rounded-neo shadow-hard-sm">
                {copy.icon}
              </div>

              {/* Text */}
              <div className="flex-1">
                <h3 className="font-black text-neo-black text-xl mb-2">
                  {copy.title}
                </h3>
                <p className="text-neo-black font-bold text-sm opacity-90">
                  {copy.description}
                </p>
              </div>
            </div>

            {/* CTA Button */}
            <motion.button
              onClick={handleCTAClick}
              whileHover={{ scale: 1.02, x: 2, y: -2 }}
              whileTap={{ scale: 0.98 }}
              className="w-full px-6 py-4 bg-neo-black text-neo-white font-black border-3 border-neo-black rounded-neo shadow-hard hover:shadow-hard-lg transition-all duration-100 uppercase text-sm flex items-center justify-center gap-2 group"
            >
              {copy.cta}
              <motion.div
                animate={{ x: [0, 4, 0] }}
                transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
              >
                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </motion.div>
            </motion.button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * Helper function to mark daily challenge as completed
 * Call this after successful challenge completion
 */
export function markDailyChallengeComplete(challengeType: 'word_hunt' | 'buzz'): void {
  const today = new Date().toISOString().split('T')[0];

  if (challengeType === 'word_hunt') {
    localStorage.setItem('daily_word_hunt_completed', today);
  } else if (challengeType === 'buzz') {
    localStorage.setItem('daily_buzz_completed', today);
  }
}

/**
 * Check if user has completed both daily challenges today
 */
export function hasCompletedBothDailyChallenges(): boolean {
  const today = new Date().toISOString().split('T')[0];
  const wordHuntCompleted = localStorage.getItem('daily_word_hunt_completed') === today;
  const buzzCompleted = localStorage.getItem('daily_buzz_completed') === today;

  return wordHuntCompleted && buzzCompleted;
}

export default NextChallengePrompt;
