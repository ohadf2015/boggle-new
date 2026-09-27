'use client';

import { useState } from 'react';
import { Trophy, Medal, ListOrdered, LogIn } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePlayGamesServices } from '@/hooks/usePlayGamesServices';
import { PLAY_GAMES_LEADERBOARDS } from '@/lib/playGames/playGamesIds';

/**
 * PlayGamesCard — Android-only settings surface for Google Play Games Services.
 *
 * Renders nothing off Android (the hook's `available` flag is false on web/iOS).
 * Lets the player sign in (Games-scoped, independent of the app account) and
 * open the native achievements / leaderboard UIs.
 */
export function PlayGamesCard({ isDarkMode }: { isDarkMode: boolean }) {
  const { t } = useLanguage();
  const { available, signIn, showAchievements, showLeaderboard } = usePlayGamesServices();
  const [busy, setBusy] = useState(false);
  const [playerName, setPlayerName] = useState<string | null>(null);

  if (!available) return null;

  const handleSignIn = async () => {
    setBusy(true);
    const res = await signIn();
    if (res.success && res.playerName) setPlayerName(res.playerName);
    setBusy(false);
  };

  const pillClass = cn(
    'inline-flex items-center gap-2 px-3 py-2 min-h-[44px] rounded-neo border-3 border-neo-black font-bold text-sm transition-transform active:translate-y-0.5',
    isDarkMode ? 'bg-neo-navy-elevated text-white' : 'bg-neo-cream text-neo-black shadow-hard',
  );

  return (
    <div
      className={cn(
        'p-4 rounded-neo border-3 border-neo-black',
        isDarkMode ? 'bg-neo-navy-light' : 'bg-white',
      )}
    >
      <div className="flex items-center gap-3 mb-3">
        <div className="w-11 h-11 min-w-[44px] rounded-lg flex items-center justify-center border-2 border-neo-black bg-neo-cyan">
          <Trophy className="w-5 h-5 text-neo-black" />
        </div>
        <div className="min-w-0">
          <p className={cn('font-bold', isDarkMode ? 'text-white' : 'text-neo-black')}>
            {t('settings.playGames.title')}
          </p>
          <p className={cn('text-xs', isDarkMode ? 'text-gray-400' : 'text-gray-600')}>
            {playerName
              ? t('settings.playGames.signedInAs').replace('{name}', playerName)
              : t('settings.playGames.subtitle')}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {!playerName && (
          <button type="button" onClick={handleSignIn} disabled={busy} className={pillClass}>
            <LogIn className="w-4 h-4" />
            {t('settings.playGames.signIn')}
          </button>
        )}
        <button type="button" onClick={() => void showAchievements()} className={pillClass}>
          <Medal className="w-4 h-4" />
          {t('settings.playGames.achievements')}
        </button>
        <button
          type="button"
          onClick={() => void showLeaderboard(PLAY_GAMES_LEADERBOARDS.highScore)}
          className={pillClass}
        >
          <ListOrdered className="w-4 h-4" />
          {t('settings.playGames.leaderboards')}
        </button>
      </div>
    </div>
  );
}
