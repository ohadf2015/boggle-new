'use client';

import React from 'react';
import { Play } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';

interface GameSession {
  gameCode?: string;
}

interface ProfileBackButtonsProps {
  activeGameSession: GameSession | null;
  isDarkMode: boolean;
}

/** Shown only while a room is still open; plain "back" lives in the header and tab bar. */
export function ProfileBackButtons({ activeGameSession }: ProfileBackButtonsProps): React.ReactNode {
  const router = useRouter();
  const { t, language } = useLanguage();

  if (!activeGameSession) return null;

  return (
    <div className="mt-6 flex justify-center">
      <Button press="chunky" variant="success" size="lg" onClick={() => router.push(`/${language}`)} className="w-full sm:w-auto">
        <Play className="me-2" aria-hidden />
        {t('profile.backToRoom')} {activeGameSession.gameCode}
      </Button>
    </div>
  );
}

export default ProfileBackButtons;
