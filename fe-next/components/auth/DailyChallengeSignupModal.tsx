'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Flame, Trophy, BarChart3, Smartphone, Shield, type LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { fireConfetti } from '@/utils/confettiUtils';
import { Button as ButtonComponent } from '../ui/button';

// Type assertion for JSX Button component
const Button = ButtonComponent as any;
import { useTheme } from '../../utils/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { signInWithGoogle, signInWithDiscord } from '../../lib/supabase';
import { cn } from '../../lib/utils';
import { setPendingDailyResult, type WordHuntResult } from '../../utils/dailyChallenge';
import type { Language } from '@/types';

// Brand icon SVG components
const GoogleIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" width="1em" height="1em">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

const DiscordIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" width="1em" height="1em">
    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
  </svg>
);

export type ConversionTrigger =
  | 'firstCompletion'
  | 'streakAtRisk'
  | 'topPercentile'
  | 'quickSolve';

interface DailyChallengeSignupModalProps {
  isOpen: boolean;
  onClose: () => void;
  trigger: ConversionTrigger;
  streakDays: number;
  percentile?: number;
  attemptsUsed?: number;
  solved: boolean;
  // Result data to save after signup
  pendingResult?: {
    result: WordHuntResult;
    puzzleNumber: number;
    puzzleDate: string;
    language: Language;
  };
}

interface Provider {
  id: 'google' | 'discord';
  icon: React.FC<{ className?: string }>;
  label: string;
  color: string;
}

interface Benefit {
  icon: LucideIcon;
  key: string;
}

const DailyChallengeSignupModal: React.FC<DailyChallengeSignupModalProps> = ({
  isOpen,
  onClose,
  trigger,
  streakDays,
  percentile,
  attemptsUsed,
  solved,
  pendingResult,
}) => {
  const { theme } = useTheme();
  const { t, language } = useLanguage();
  const isDarkMode = theme === 'dark';
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Get dynamic title and subtitle based on trigger
  const getTitleContent = () => {
    switch (trigger) {
      case 'streakAtRisk':
        return {
          emoji: '🔥',
          title: t('auth.dailyChallenge.streakAtRisk.title').replace('{days}', String(streakDays)),
          subtitle: t('auth.dailyChallenge.streakAtRisk.subtitle'),
        };
      case 'topPercentile':
        return {
          emoji: '🏆',
          title: t('auth.dailyChallenge.topPercentile.title').replace('{percentile}', String(percentile || 10)),
          subtitle: t('auth.dailyChallenge.topPercentile.subtitle'),
        };
      case 'quickSolve':
        return {
          emoji: '⚡',
          title: t('auth.dailyChallenge.quickSolve.title').replace('{attempts}', String(attemptsUsed || 1)),
          subtitle: t('auth.dailyChallenge.quickSolve.subtitle'),
        };
      case 'firstCompletion':
      default:
        return {
          emoji: solved ? '✨' : '💪',
          title: t('auth.dailyChallenge.firstCompletion.title'),
          subtitle: t('auth.dailyChallenge.firstCompletion.subtitle'),
        };
    }
  };

  const titleContent = getTitleContent();

  // Trigger celebratory confetti for success states
  useEffect(() => {
    if (isOpen && solved && (trigger === 'topPercentile' || trigger === 'quickSolve')) {
      const timer = setTimeout(() => {
        fireConfetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.4 },
          colors: ['#10B981', '#FFE135', '#00D9FF', '#FF6B6B']
        });
      }, 300);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [isOpen, solved, trigger]);

  const handleSignIn = async (provider: 'google' | 'discord') => {
    setIsLoading(provider);
    setError(null);

    try {
      // Store the pending result in localStorage before OAuth redirect
      if (pendingResult) {
        setPendingDailyResult({
          ...pendingResult,
          trigger, // Include the conversion trigger for onboarding UX
        });
      }

      let result;
      switch (provider) {
        case 'google':
          result = await signInWithGoogle();
          break;
        case 'discord':
          result = await signInWithDiscord();
          break;
        default:
          throw new Error('Unknown provider');
      }

      if (result.error) {
        setError(result.error.message);
        setIsLoading(null);
      }
      // OAuth will redirect, so no need to close modal
    } catch (err) {
      setError((err as Error).message || 'An error occurred');
      setIsLoading(null);
    }
  };

  const providers: Provider[] = [
    { id: 'google', icon: GoogleIcon, label: 'Google', color: 'bg-brand-google text-white hover:bg-brand-google-hover' },
    { id: 'discord', icon: DiscordIcon, label: 'Discord', color: 'bg-brand-discord text-white hover:bg-brand-discord-hover' }
  ];

  const benefits: Benefit[] = [
    { icon: Shield, key: 'protectStreak' },
    { icon: Smartphone, key: 'syncDevices' },
    { icon: BarChart3, key: 'trackStats' },
    { icon: Trophy, key: 'allTimeLeaderboard' },
  ];

  if (!isOpen) return null;
  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.8, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          className={cn(
            'w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl p-6 shadow-2xl relative',
            isDarkMode
              ? 'bg-gradient-to-b from-slate-800 via-slate-800 to-slate-900 border border-orange-500/30'
              : 'bg-gradient-to-b from-white via-white to-gray-50 border border-orange-400/50'
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Decorative background glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-gradient-to-b from-orange-500/20 to-transparent rounded-full blur-3xl pointer-events-none" />

          {/* Close button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="absolute top-4 right-4 rtl:right-auto rtl:left-4 rounded-full z-10"
            asChild={false}
          >
            <X size={18} />
          </Button>

          {/* Streak/Achievement icon animation */}
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', damping: 10, stiffness: 100, delay: 0.2 }}
            className="flex justify-center mb-4"
          >
            <div className="relative">
              <motion.div
                animate={{
                  scale: [1, 1.1, 1],
                }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                className="text-6xl"
              >
                {titleContent.emoji}
              </motion.div>
              {/* Sparkle effects for streak */}
              {trigger === 'streakAtRisk' && streakDays >= 3 && (
                <>
                  <motion.div
                    className="absolute -top-2 -right-2 rtl:-right-auto rtl:-left-2 w-4 h-4 bg-orange-400 rounded-full"
                    animate={{ scale: [0, 1, 0], opacity: [0, 1, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity, delay: 0 }}
                  />
                  <motion.div
                    className="absolute -top-1 -left-3 rtl:-left-auto rtl:-right-3 w-3 h-3 bg-red-400 rounded-full"
                    animate={{ scale: [0, 1, 0], opacity: [0, 1, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }}
                  />
                </>
              )}
            </div>
          </motion.div>

          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-center mb-4"
          >
            <h2 className={cn(
              'text-2xl font-bold mb-2',
              isDarkMode
                ? 'text-transparent bg-clip-text bg-gradient-to-r from-orange-300 via-red-300 to-orange-400'
                : 'text-transparent bg-clip-text bg-gradient-to-r from-orange-500 via-red-500 to-orange-600'
            )}>
              {titleContent.title}
            </h2>
            <p className={cn(
              'text-sm',
              isDarkMode ? 'text-gray-300' : 'text-gray-600'
            )}>
              {titleContent.subtitle}
            </p>
          </motion.div>

          {/* Streak warning box (for streak at risk) */}
          {trigger === 'streakAtRisk' && streakDays >= 3 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.35 }}
              className={cn(
                'mb-4 p-3 rounded-xl border-2 flex items-center gap-3',
                isDarkMode
                  ? 'bg-orange-900/30 border-orange-500/50'
                  : 'bg-orange-50 border-orange-300'
              )}
            >
              <Flame className={cn(
                'w-8 h-8 flex-shrink-0',
                isDarkMode ? 'text-orange-400' : 'text-orange-500'
              )} />
              <div>
                <div className={cn(
                  'font-bold text-lg',
                  isDarkMode ? 'text-orange-300' : 'text-orange-600'
                )}>
                  {streakDays} {t('auth.dailyChallenge.dayStreak')}
                </div>
                <div className={cn(
                  'text-xs',
                  isDarkMode ? 'text-orange-400/80' : 'text-orange-500/80'
                )}>
                  {t('auth.dailyChallenge.atRiskWarning')}
                </div>
              </div>
            </motion.div>
          )}

          {/* Benefits list */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className={cn(
              'mb-5 p-4 rounded-xl',
              isDarkMode ? 'bg-slate-700/50' : 'bg-gray-50'
            )}
          >
            <p className={cn(
              'text-sm font-medium mb-3',
              isDarkMode ? 'text-gray-300' : 'text-gray-600'
            )}>
              {t('auth.dailyChallenge.benefitsTitle')}
            </p>
            <ul className="space-y-2">
              {benefits.map((benefit, index) => (
                <motion.li
                  key={benefit.key}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.45 + index * 0.08 }}
                  className={cn(
                    'flex items-center gap-3 text-sm',
                    isDarkMode ? 'text-gray-200' : 'text-gray-700'
                  )}
                >
                  <benefit.icon className={cn(
                    'flex-shrink-0 w-4 h-4',
                    isDarkMode ? 'text-cyan-400' : 'text-cyan-600'
                  )} />
                  <span>{t(`auth.dailyChallenge.benefits.${benefit.key}`)}</span>
                </motion.li>
              ))}
            </ul>
          </motion.div>

          {/* Auto-save note */}
          {pendingResult && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.55 }}
              className={cn(
                'mb-4 p-2 rounded-lg text-center text-xs',
                isDarkMode ? 'bg-green-900/30 border border-green-500/30' : 'bg-green-50 border border-green-200'
              )}
            >
              <span className={isDarkMode ? 'text-green-300' : 'text-green-700'}>
                ✓ {t('auth.dailyChallenge.autoSaveNote')}
              </span>
            </motion.div>
          )}

          {/* Sign In Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="space-y-3"
          >
            {providers.map((provider) => (
              <Button
                key={provider.id}
                onClick={() => handleSignIn(provider.id)}
                disabled={isLoading !== null}
                className={cn(
                  'w-full h-12 text-base font-medium rounded-xl transition-all',
                  provider.color
                )}
                asChild={false}
              >
                {isLoading === provider.id ? (
                  <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  <provider.icon className="w-5 h-5" />
                )}
                <span className="ml-2">
                  {t('auth.signInWith', { provider: provider.label })}
                </span>
              </Button>
            ))}
          </motion.div>

          {/* Error Message */}
          {error && (
            <div className="mt-4 p-3 rounded-lg bg-red-100 text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Continue as Guest */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="mt-5 text-center"
          >
            <button
              onClick={onClose}
              className={cn(
                'text-sm hover:underline',
                isDarkMode ? 'text-gray-500 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'
              )}
            >
              {t('auth.dailyChallenge.maybeLater')}
            </button>
          </motion.div>

          {/* Terms */}
          <p className={cn(
            'mt-4 text-xs text-center',
            isDarkMode ? 'text-gray-500' : 'text-gray-500'
          )}>
            {t('auth.termsPrefix')}{' '}
            <Link
              href={`/${language}/legal/terms`}
              className={cn(
                'underline transition-colors',
                isDarkMode ? 'hover:text-cyan-400' : 'hover:text-cyan-600'
              )}
              onClick={(e) => e.stopPropagation()}
            >
              {t('auth.termsLink')}
            </Link>
            {' '}{t('auth.andText')}{' '}
            <Link
              href={`/${language}/legal/privacy`}
              className={cn(
                'underline transition-colors',
                isDarkMode ? 'hover:text-cyan-400' : 'hover:text-cyan-600'
              )}
              onClick={(e) => e.stopPropagation()}
            >
              {t('auth.privacyLink')}
            </Link>
          </p>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
};

export default DailyChallengeSignupModal;
