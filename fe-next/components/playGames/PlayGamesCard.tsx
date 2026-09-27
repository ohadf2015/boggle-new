'use client';

/**
 * PlayGamesCard — Android-only Play Games Services entry point on the profile.
 *
 * The PGS award path (achievements/leaderboards in `lib/playGames/awardPlayGames`)
 * only registers once the player has an authenticated Games session. This card is
 * the visible surface that (a) lets the player connect and (b) opens Google's
 * native achievement / leaderboard overlays. Off Android the hook reports
 * `available=false` and the card renders nothing.
 */

import { useState } from 'react';
import { m } from 'framer-motion';
import { Gamepad2, Trophy, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePlayGamesServices } from '@/hooks/usePlayGamesServices';
import { getCachedPlayGamesSignIn } from '@/utils/nativePGS';
import { PLAY_GAMES_LEADERBOARDS } from '@/lib/playGames/playGamesIds';

interface PlayGamesCardProps {
  delay?: number;
}

export function PlayGamesCard({ delay = 0.22 }: PlayGamesCardProps): React.ReactNode {
  const { t } = useLanguage();
  const { available, signIn, showAchievements, showLeaderboard } = usePlayGamesServices();
  // Seed from the app-start silent sign-in so returning players land "connected"
  // without re-tapping. '' is a valid (anonymous) connected name → treat null only.
  const [playerName, setPlayerName] = useState<string | null>(
    () => getCachedPlayGamesSignIn()?.playerName ?? null,
  );
  const [connecting, setConnecting] = useState(false);

  if (!available) return null;

  const connected = playerName !== null;

  const handleConnect = async (): Promise<void> => {
    setConnecting(true);
    const res = await signIn();
    setConnecting(false);
    if (res.success) setPlayerName(res.playerName ?? '');
  };

  return (
    <m.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="rounded-neo-lg border-4 border-neo-cream/40 bg-neo-navy-light shadow-hard-lg p-5"
    >
      <div className="flex items-center gap-3 mb-3">
        <Gamepad2 className="w-7 h-7 text-neo-lime shrink-0" aria-hidden />
        <h3 className="text-xl font-black uppercase tracking-tight text-neo-white">
          {t('playGames.title')}
        </h3>
      </div>

      {connected ? (
        <>
          <p className="text-sm text-neo-cream/80 mb-1">{t('playGames.signedIn')}</p>
          {playerName ? <p className="text-base font-black text-neo-lime mb-4">{playerName}</p> : <div className="mb-4" />}
          <div className="grid grid-cols-2 gap-3">
            <Button variant="cyan" onClick={() => void showAchievements()} className="w-full">
              <Trophy className="w-5 h-5 me-1" aria-hidden />
              {t('playGames.achievements')}
            </Button>
            <Button
              variant="cyan"
              onClick={() => void showLeaderboard(PLAY_GAMES_LEADERBOARDS.highScore)}
              className="w-full"
            >
              <BarChart3 className="w-5 h-5 me-1" aria-hidden />
              {t('playGames.leaderboards')}
            </Button>
          </div>
        </>
      ) : (
        <>
          <p className="text-sm text-neo-cream/80 mb-4">{t('playGames.connectPrompt')}</p>
          <Button
            variant="gradient"
            onClick={() => void handleConnect()}
            disabled={connecting}
            className="w-full"
          >
            <Gamepad2 className="w-5 h-5 me-1" aria-hidden />
            {connecting ? t('playGames.connecting') : t('playGames.connect')}
          </Button>
        </>
      )}
    </m.div>
  );
}
