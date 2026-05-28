'use client';

import React from 'react';
import { m } from 'framer-motion';
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
    <m.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3"
    >
      {activeGameSession && (
        <Button
          onClick={() => router.push(`/${language}`)}
          className={cn(
            'w-full sm:w-auto px-8 py-3 rounded-2xl font-black uppercase tracking-wide transition-all',
            'bg-neo-lime text-neo-black hover:opacity-90'
          )}
        >
          <Play className="me-2" />
          {t('profile.backToRoom')} {activeGameSession.gameCode}
        </Button>
      )}

      <Button
        onClick={() => router.push(`/${language}`)}
        variant={activeGameSession ? 'outline' : 'default'}
        className={cn(
          'w-full sm:w-auto px-8 py-3 rounded-2xl font-black uppercase tracking-wide transition-all',
          activeGameSession
            ? 'bg-neo-navy-light/40 border border-white/[0.08] text-gray-300 hover:bg-neo-navy-elevated/60'
            : 'bg-linear-to-r from-neo-cyan to-neo-cyan/80 text-neo-black hover:opacity-90'
        )}
      >
        <ArrowLeft className="me-2 rtl:rotate-180" />
        {activeGameSession
          ? (t('profile.backToLobby'))
          : (t('profile.backToGame'))}
      </Button>
    </m.div>
  );
}

export default ProfileBackButtons;
