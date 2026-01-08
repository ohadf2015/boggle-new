'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Play } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

interface GameSession {
  gameCode?: string;
}

interface ProfileBackButtonsProps {
  activeGameSession: GameSession | null;
  isDarkMode: boolean;
  delay?: number;
}

export function ProfileBackButtons({
  activeGameSession,
  isDarkMode,
  delay = 0.4
}: ProfileBackButtonsProps): React.ReactNode {
  const router = useRouter();
  const { t, language } = useLanguage();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3"
    >
      {activeGameSession && (
        <Button
          onClick={() => router.push(`/${language}`)}
          className={cn(
            'px-6 py-3 rounded-neo border-3 border-neo-black font-black uppercase tracking-wide transition-all',
            'shadow-hard hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-hard-lg',
            'active:translate-x-[2px] active:translate-y-[2px] active:shadow-none',
            'bg-neo-lime text-neo-black hover:bg-neo-lime/90'
          )}
        >
          <Play className="me-2" />
          {t('profile.backToRoom') || 'Back to Room'} {activeGameSession.gameCode}
        </Button>
      )}

      <Button
        onClick={() => router.push(`/${language}`)}
        variant={activeGameSession ? 'outline' : 'default'}
        className={cn(
          'px-6 py-3 rounded-neo border-3 border-neo-black font-black uppercase tracking-wide transition-all',
          'shadow-hard hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-hard-lg',
          'active:translate-x-[2px] active:translate-y-[2px] active:shadow-none',
          activeGameSession
            ? isDarkMode
              ? 'bg-slate-700 text-gray-300 hover:bg-slate-600'
              : 'bg-white text-gray-700 hover:bg-gray-100'
            : isDarkMode
              ? 'bg-neo-cyan text-neo-black hover:bg-neo-cyan/90'
              : 'bg-neo-pink text-neo-white hover:bg-neo-pink/90'
        )}
      >
        <ArrowLeft className="me-2 rtl:rotate-180" />
        {activeGameSession
          ? (t('profile.backToLobby') || 'Back to Lobby')
          : (t('profile.backToGame') || 'Back to Game')}
      </Button>
    </motion.div>
  );
}

export default ProfileBackButtons;
