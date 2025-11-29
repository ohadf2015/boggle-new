'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FaGoogle, FaDiscord, FaTimes, FaTrophy, FaChartLine, FaMedal, FaUsers } from 'react-icons/fa';
import type { IconType } from 'react-icons';
import Link from 'next/link';
import confetti from 'canvas-confetti';
import { Button as ButtonComponent } from '../ui/button';

// Type assertion for JSX Button component
const Button = ButtonComponent as any;
import { useTheme } from '../../utils/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { signInWithGoogle, signInWithDiscord } from '../../lib/supabase';
import { getGuestStatsSummary } from '../../utils/guestManager';
import { cn } from '../../lib/utils';

interface FirstWinSignupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface GuestStats {
  gamesPlayed: number;
  totalScore: number;
}

interface Provider {
  id: 'google' | 'discord';
  icon: IconType;
  label: string;
  color: string;
}

interface Benefit {
  icon: IconType;
  key: string;
}

const FirstWinSignupModal: React.FC<FirstWinSignupModalProps> = ({ isOpen, onClose }) => {
  const { theme } = useTheme();
  const { t, language } = useLanguage();
  const isDarkMode = theme === 'dark';
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const guestStats: GuestStats = getGuestStatsSummary();

  // Trigger celebratory confetti when modal opens
  useEffect(() => {
    if (isOpen) {
      // Delay confetti slightly for better effect
      const timer = setTimeout(() => {
        confetti({
          particleCount: 150,
          spread: 100,
          origin: { y: 0.4 },
          colors: ['#FFD700', '#FFA500', '#FF6347', '#00CED1', '#9370DB']
        });
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleSignIn = async (provider: 'google' | 'discord') => {
    setIsLoading(provider);
    setError(null);

    try {
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
    { id: 'google', icon: FaGoogle, label: 'Google', color: 'bg-brand-google text-white hover:bg-brand-google-hover' },
    { id: 'discord', icon: FaDiscord, label: 'Discord', color: 'bg-brand-discord text-white hover:bg-brand-discord-hover' }
  ];

  const benefits: Benefit[] = [
    { icon: FaChartLine, key: 'trackProgress' },
    { icon: FaMedal, key: 'leaderboard' },
    { icon: FaUsers, key: 'playWithFriends' }
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
            'w-full max-w-md rounded-2xl p-6 shadow-2xl overflow-hidden relative',
            isDarkMode
              ? 'bg-gradient-to-b from-slate-800 via-slate-800 to-slate-900 border border-yellow-500/30'
              : 'bg-gradient-to-b from-white via-white to-gray-50 border border-yellow-400/50'
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Decorative background glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-gradient-to-b from-yellow-500/20 to-transparent rounded-full blur-3xl pointer-events-none" />

          {/* Close button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="absolute top-4 right-4 rounded-full z-10"
            asChild={false}
          >
            <FaTimes size={18} />
          </Button>

          {/* Trophy animation */}
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
                  rotate: [-5, 5, -5]
                }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              >
                <FaTrophy className="text-6xl text-yellow-500 drop-shadow-[0_0_20px_rgba(234,179,8,0.5)]" />
              </motion.div>
              {/* Sparkle effects */}
              <motion.div
                className="absolute -top-2 -right-2 w-4 h-4 bg-yellow-300 rounded-full"
                animate={{ scale: [0, 1, 0], opacity: [0, 1, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: 0 }}
              />
              <motion.div
                className="absolute -top-1 -left-3 w-3 h-3 bg-yellow-400 rounded-full"
                animate={{ scale: [0, 1, 0], opacity: [0, 1, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }}
              />
              <motion.div
                className="absolute -bottom-1 right-0 w-2 h-2 bg-orange-400 rounded-full"
                animate={{ scale: [0, 1, 0], opacity: [0, 1, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: 1 }}
              />
            </div>
          </motion.div>

          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-center mb-6"
          >
            <h2 className={cn(
              'text-2xl font-bold mb-2',
              isDarkMode
                ? 'text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-orange-300 to-yellow-400'
                : 'text-transparent bg-clip-text bg-gradient-to-r from-yellow-500 via-orange-500 to-yellow-600'
            )}>
              {t('auth.firstWin.title')}
            </h2>
            <p className={cn(
              'text-sm',
              isDarkMode ? 'text-gray-300' : 'text-gray-600'
            )}>
              {t('auth.firstWin.subtitle')}
            </p>
          </motion.div>

          {/* Benefits list */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className={cn(
              'mb-6 p-4 rounded-xl',
              isDarkMode ? 'bg-slate-700/50' : 'bg-gray-50'
            )}
          >
            <p className={cn(
              'text-sm font-medium mb-3',
              isDarkMode ? 'text-gray-300' : 'text-gray-600'
            )}>
              {t('auth.firstWin.benefitsTitle')}
            </p>
            <ul className="space-y-2">
              {benefits.map((benefit, index) => (
                <motion.li
                  key={benefit.key}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + index * 0.1 }}
                  className={cn(
                    'flex items-center gap-3 text-sm',
                    isDarkMode ? 'text-gray-200' : 'text-gray-700'
                  )}
                >
                  <benefit.icon className={cn(
                    'flex-shrink-0',
                    isDarkMode ? 'text-cyan-400' : 'text-cyan-600'
                  )} />
                  <span>{t(`auth.firstWin.benefits.${benefit.key}`)}</span>
                </motion.li>
              ))}
            </ul>
          </motion.div>

          {/* Current stats teaser */}
          {guestStats && guestStats.gamesPlayed > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className={cn(
                'mb-6 p-3 rounded-lg text-center text-sm',
                isDarkMode ? 'bg-cyan-900/30 border border-cyan-500/30' : 'bg-cyan-50 border border-cyan-200'
              )}
            >
              <span className={isDarkMode ? 'text-cyan-300' : 'text-cyan-700'}>
                {t('auth.firstWin.statsTeaser', {
                  games: guestStats.gamesPlayed,
                  score: guestStats.totalScore
                })}
              </span>
            </motion.div>
          )}

          {/* Sign In Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
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
                  <provider.icon size={20} />
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
            transition={{ delay: 0.8 }}
            className="mt-6 text-center"
          >
            <button
              onClick={onClose}
              className={cn(
                'text-sm hover:underline',
                isDarkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'
              )}
            >
              {t('auth.firstWin.maybeLater')}
            </button>
          </motion.div>

          {/* Terms */}
          <p className={cn(
            'mt-4 text-xs text-center',
            isDarkMode ? 'text-gray-500' : 'text-gray-400'
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

export default FirstWinSignupModal;
