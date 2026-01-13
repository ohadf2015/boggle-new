'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Target } from 'lucide-react';
import { NeoLoader } from '@/components/ui/NeoLoader';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { signInWithGoogle, signInWithDiscord } from '@/lib/supabase';
import { cn } from '@/lib/utils';

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

interface WordHuntLoginGateProps {
  puzzleNumber: number;
  puzzleDate: string;
  onBack: () => void;
}

const WordHuntLoginGate: React.FC<WordHuntLoginGateProps> = ({
  puzzleNumber,
  onBack,
}) => {
  const { t } = useLanguage();
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = async (provider: 'google' | 'discord') => {
    setIsLoading(provider);
    setError(null);

    try {
      const result = provider === 'google'
        ? await signInWithGoogle()
        : await signInWithDiscord();

      if (result.error) {
        setError(result.error.message);
        setIsLoading(null);
      }
    } catch (err) {
      setError((err as Error).message || 'An error occurred');
      setIsLoading(null);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col items-center justify-center min-h-[80vh] px-4 py-8"
    >
      {/* Back button */}
      <div className="absolute top-4 left-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="gap-2 text-gray-400 hover:text-white"
        >
          <ArrowLeft size={18} />
          {t('common.back')}
        </Button>
      </div>

      {/* Main card */}
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className={cn(
          'w-full max-w-sm rounded-2xl p-6 sm:p-8',
          'bg-neo-navy',
          'border-4 border-neo-lime shadow-hard-lg'
        )}
      >
        {/* Puzzle badge */}
        <div className="flex justify-center mb-5">
          <div className="bg-neo-lime text-black px-4 py-1.5 rounded-full font-bold text-sm shadow-hard-sm">
            {t('daily.puzzleNumber', { number: puzzleNumber })}
          </div>
        </div>

        {/* Target icon - simpler, cleaner */}
        <div className="flex justify-center mb-5">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-neo-pink to-neo-cyan flex items-center justify-center shadow-hard">
            <Target className="w-8 h-8 text-white" />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-xl sm:text-2xl font-bold text-center text-white mb-2">
          {t('auth.wordHunt.gateTitle')}
        </h1>

        {/* Subtitle */}
        <p className="text-gray-400 text-center text-sm mb-6">
          {t('auth.wordHunt.gateSubtitle')}
        </p>

        {/* Auth buttons - prominent and clear */}
        <div className="space-y-3">
          <Button
            onClick={() => handleSignIn('google')}
            disabled={isLoading !== null}
            className={cn(
              'w-full h-12 text-base font-bold rounded-xl',
              'bg-white text-gray-800 hover:bg-gray-100',
              'border-3 border-black shadow-hard',
              'transition-all active:translate-y-1 active:shadow-hard-pressed'
            )}
          >
            {isLoading === 'google' ? (
              <NeoLoader variant="dots" size="sm" />
            ) : (
              <GoogleIcon className="w-5 h-5" />
            )}
            <span className="ml-2">{t('auth.signInWith', { provider: 'Google' })}</span>
          </Button>

          <Button
            onClick={() => handleSignIn('discord')}
            disabled={isLoading !== null}
            className={cn(
              'w-full h-12 text-base font-bold rounded-xl',
              'bg-brand-discord text-white hover:bg-brand-discord-hover',
              'border-3 border-black shadow-hard',
              'transition-all active:translate-y-1 active:shadow-hard-pressed'
            )}
          >
            {isLoading === 'discord' ? (
              <NeoLoader variant="dots" size="sm" />
            ) : (
              <DiscordIcon className="w-5 h-5" />
            )}
            <span className="ml-2">{t('auth.signInWith', { provider: 'Discord' })}</span>
          </Button>
        </div>

        {/* Error message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 p-3 rounded-lg bg-red-900/30 border border-red-500/50 text-red-300 text-sm text-center"
          >
            {error}
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
};

export default WordHuntLoginGate;
