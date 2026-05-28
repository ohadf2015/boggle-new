'use client';

/**
 * Party Hub — game night launcher.
 * Feature-flag gated: only visible to users with party_games_alpha.
 */

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useFeatureFlag } from '@/hooks/useFeatureFlag';
import { PARTY_GAMES, type PartyGameId } from '@/shared/types/partyGame';

const GAME_LIST = Object.values(PARTY_GAMES);

/** Unique accent colors per game */
const ACCENT_STYLES: Record<PartyGameId, { bg: string; border: string; shadow: string; glow: string }> = {
  'caption-clash': {
    bg: 'bg-linear-to-br from-neo-pink via-neo-pink-light to-neo-pink-dark',
    border: 'border-neo-pink',
    shadow: 'shadow-hard-pink',
    glow: 'hover:shadow-[0_0_20px_rgba(255,20,147,0.4)]',
  },
  'pixel-clash': {
    bg: 'bg-linear-to-br from-neo-cyan via-neo-cyan-light to-neo-cyan-dark',
    border: 'border-neo-cyan',
    shadow: 'shadow-hard-cyan',
    glow: 'hover:shadow-[0_0_20px_rgba(0,255,255,0.4)]',
  },
  'shadow-clash': {
    bg: 'bg-linear-to-br from-neo-purple via-neo-purple-light to-neo-purple-dark',
    border: 'border-neo-purple',
    shadow: 'shadow-hard-purple',
    glow: 'hover:shadow-[0_0_20px_rgba(139,92,246,0.4)]',
  },
};

export default function PartyHubClient() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const locale = params?.locale as string || 'en';

  const { enabled: flagEnabled, loading } = useFeatureFlag('party_games_alpha', user?.id);
  const hasAccess = flagEnabled || process.env.NODE_ENV === 'development';
  const [joining, setJoining] = useState(false);
  const [joinCode, setJoinCode] = useState('');

  // Gate: if no access, show nothing
  if (loading) {
    return (
      <div className="min-h-screen bg-neo-navy flex items-center justify-center">
        <div className="animate-pulse text-neo-white font-neo-display text-xl">
          {t('common.loading') || 'Loading...'}
        </div>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-neo-navy flex items-center justify-center">
        <div className="text-neo-white font-neo-body text-center">
          <p className="text-lg">{t('party.noAccess') || 'Party games are not available yet.'}</p>
          <p className="text-sm mt-2">{t('party.comingSoon') || 'Coming soon!'}</p>
        </div>
      </div>
    );
  }

  const handleSelectGame = (gameId: PartyGameId) => {
    router.push(`/${locale}/party/${gameId}/host`);
  };

  const handleJoinRoom = () => {
    if (joinCode.trim().length >= 4) {
      router.push(`/${locale}/party/join?code=${joinCode.trim().toUpperCase()}`);
    }
  };

  return (
    <div className="min-h-screen bg-neo-navy p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="font-neo-display text-4xl sm:text-5xl text-neo-white uppercase tracking-tight">
            {t('party.title') || 'Party Games'}
          </h1>
          <p className="font-neo-body text-neo-white mt-2 text-sm uppercase tracking-wide">
            {t('party.subtitle') || 'Grab your phones!'}
          </p>
          <div className="mt-2 inline-block bg-neo-red/20 border-2 border-neo-red rounded-neo px-3 py-1">
            <span className="text-neo-red text-xs font-bold uppercase tracking-wider">Alpha</span>
          </div>
        </div>

        {/* Game Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8">
          {GAME_LIST.map((game) => {
            const accent = ACCENT_STYLES[game.id];
            return (
              <button
                key={game.id}
                onClick={() => handleSelectGame(game.id)}
                className={`
                  ${accent.bg} ${accent.shadow}
                  border-3 border-neo-black rounded-neo-lg
                  p-5 text-start
                  transition-all duration-100
                  hover:-translate-x-px hover:-translate-y-px hover:shadow-hard-lg
                  active:translate-x-[2px] active:translate-y-[2px] active:shadow-hard-pressed
                  ${accent.glow}
                `}
              >
                <div className="text-4xl mb-3">{game.icon}</div>
                <h2 className="font-neo-display text-neo-black text-xl uppercase tracking-tight">
                  {t(game.nameKey) || game.id}
                </h2>
                <p className="font-neo-body text-neo-black/70 text-sm mt-1">
                  {t(game.descriptionKey) || `${game.minPlayers}-${game.maxPlayers} players`}
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <span className="bg-neo-black/20 rounded-neo px-2 py-0.5 text-xs font-bold text-neo-black">
                    {game.minPlayers}-{game.maxPlayers}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Join Existing Room */}
        <div className="bg-neo-navy-elevated border-3 border-neo-cream/30 rounded-neo-lg shadow-hard p-5">
          <h3 className="font-neo-display text-neo-white text-lg uppercase mb-3">
            {t('party.joinRoom') || 'Join a Room'}
          </h3>
          <div className="flex gap-3">
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder={t('party.enterCode') || 'ROOM CODE'}
              maxLength={6}
              className="
                flex-1 bg-neo-navy border-3 border-neo-cream/40 rounded-neo
                px-4 py-3 text-neo-white font-neo-display text-xl text-center
                uppercase tracking-[0.3em]
                placeholder:text-neo-white placeholder:tracking-[0.2em]
                focus:outline-hidden focus:border-neo-lime
                transition-colors
              "
            />
            <button
              onClick={handleJoinRoom}
              disabled={joinCode.trim().length < 4}
              className="
                bg-neo-lime border-3 border-neo-black rounded-neo shadow-hard
                px-6 py-3 font-neo-display text-neo-black uppercase font-bold
                transition-all duration-100
                hover:-translate-x-px hover:-translate-y-px hover:shadow-hard-lg
                active:translate-x-[2px] active:translate-y-[2px] active:shadow-hard-pressed
                disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-x-0 disabled:hover:translate-y-0
              "
            >
              {t('party.join') || 'Join'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
