'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaGoogle, FaDiscord, FaTimes } from 'react-icons/fa';
import { Button } from '../ui/button';
import { useTheme } from '../../utils/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { signInWithGoogle, signInWithDiscord } from '../../lib/supabase';
import { getGuestStatsSummary } from '../../utils/guestManager';
import { cn } from '../../lib/utils';

const AuthModal = ({ isOpen, onClose, showGuestStats = false }) => {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const isDarkMode = theme === 'dark';
  const [isLoading, setIsLoading] = useState(null);
  const [error, setError] = useState(null);

  const guestStats = showGuestStats ? getGuestStatsSummary() : null;

  const handleSignIn = async (provider) => {
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
      setError(err.message || 'An error occurred');
      setIsLoading(null);
    }
  };

  const providers = [
    { id: 'google', icon: FaGoogle, label: 'Google', color: 'bg-[#4285F4] text-white hover:bg-[#3367D6]' },
    { id: 'discord', icon: FaDiscord, label: 'Discord', color: 'bg-[#5865F2] text-white hover:bg-[#4752C4]' }
  ];

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className={cn(
            'w-full max-w-md rounded-2xl p-6 shadow-2xl',
            isDarkMode ? 'bg-slate-800 border border-slate-700' : 'bg-white'
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className={cn(
              'text-xl font-bold',
              isDarkMode ? 'text-white' : 'text-gray-900'
            )}>
              {t('auth.signIn')}
            </h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="rounded-full"
            >
              <FaTimes size={18} />
            </Button>
          </div>

          {/* Guest Stats Preview */}
          {showGuestStats && guestStats && guestStats.gamesPlayed > 0 && (
            <div className={cn(
              'mb-6 p-4 rounded-xl',
              isDarkMode ? 'bg-slate-700/50' : 'bg-gray-50'
            )}>
              <p className={cn(
                'text-sm font-medium mb-2',
                isDarkMode ? 'text-gray-300' : 'text-gray-600'
              )}>
                {t('auth.guestStatsTitle')}
              </p>
              <div className="flex gap-4 text-sm">
                <div className={cn(
                  'flex-1 text-center p-2 rounded-lg',
                  isDarkMode ? 'bg-slate-600' : 'bg-white'
                )}>
                  <div className={cn(
                    'font-bold text-lg',
                    isDarkMode ? 'text-cyan-400' : 'text-cyan-600'
                  )}>
                    {guestStats.gamesPlayed}
                  </div>
                  <div className={cn(
                    'text-xs',
                    isDarkMode ? 'text-gray-400' : 'text-gray-500'
                  )}>
                    {t('profile.totalGames')}
                  </div>
                </div>
                <div className={cn(
                  'flex-1 text-center p-2 rounded-lg',
                  isDarkMode ? 'bg-slate-600' : 'bg-white'
                )}>
                  <div className={cn(
                    'font-bold text-lg',
                    isDarkMode ? 'text-purple-400' : 'text-purple-600'
                  )}>
                    {guestStats.totalScore}
                  </div>
                  <div className={cn(
                    'text-xs',
                    isDarkMode ? 'text-gray-400' : 'text-gray-500'
                  )}>
                    {t('profile.totalScore')}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Sign In Buttons */}
          <div className="space-y-3">
            {providers.map((provider) => (
              <Button
                key={provider.id}
                onClick={() => handleSignIn(provider.id)}
                disabled={isLoading !== null}
                className={cn(
                  'w-full h-12 text-base font-medium rounded-xl transition-all',
                  provider.color
                )}
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
          </div>

          {/* Error Message */}
          {error && (
            <div className="mt-4 p-3 rounded-lg bg-red-100 text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Continue as Guest */}
          <div className="mt-6 text-center">
            <button
              onClick={onClose}
              className={cn(
                'text-sm hover:underline',
                isDarkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'
              )}
            >
              {t('auth.continueAsGuest')}
            </button>
          </div>

          {/* Terms */}
          <p className={cn(
            'mt-4 text-xs text-center',
            isDarkMode ? 'text-gray-500' : 'text-gray-400'
          )}>
            {t('auth.termsAgreement')}
          </p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default AuthModal;
