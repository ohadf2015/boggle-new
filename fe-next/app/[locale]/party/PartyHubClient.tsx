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
import { TopBackLink } from '@/components/navigation/TopBackLink';
import { PARTY_GAMES, type PartyGameId } from '@/shared/types/partyGame';

const GAME_LIST = Object.values(PARTY_GAMES);

/** Per-game accent + visual identity */
const GAME_META: Record<PartyGameId, {
  bg: string;
  border: string;
  shadow: string;
  accentText: string;
  tagBg: string;
  tagText: string;
  typeLabel: string;
  mechanic: string;
  stepEmojis: string[];
}> = {
  'caption-clash': {
    bg: 'bg-neo-pink',
    border: 'border-neo-black',
    shadow: 'shadow-[4px_4px_0px_#000]',
    accentText: 'text-neo-black',
    tagBg: 'bg-neo-black',
    tagText: 'text-neo-pink',
    typeLabel: 'Caption',
    mechanic: 'Funniest caption wins',
    stepEmojis: ['🖼️', '✍️', '😂', '👑'],
  },
  'pixel-clash': {
    bg: 'bg-neo-cyan',
    border: 'border-neo-black',
    shadow: 'shadow-[4px_4px_0px_#000]',
    accentText: 'text-neo-black',
    tagBg: 'bg-neo-black',
    tagText: 'text-neo-cyan',
    typeLabel: 'Drawing',
    mechanic: 'Draw, guess & rebuild',
    stepEmojis: ['💬', '🎨', '🔍', '🏆'],
  },
  'shadow-clash': {
    bg: 'bg-neo-purple',
    border: 'border-neo-black',
    shadow: 'shadow-[4px_4px_0px_#000]',
    accentText: 'text-neo-white',
    tagBg: 'bg-neo-black',
    tagText: 'text-neo-purple',
    typeLabel: 'Deduction',
    mechanic: 'Hunt the hidden wolves',
    stepEmojis: ['🃏', '🌙', '🗣️', '☀️'],
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
  const [joinCode, setJoinCode] = useState('');

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
        <TopBackLink className="mb-4" />

        {/* Header */}
        <div className="text-center mb-2">
          <div className="inline-flex items-center gap-2 mb-3">
            <span className="text-4xl">🎉</span>
            <h1 className="font-neo-display text-4xl sm:text-5xl text-neo-white uppercase tracking-tight">
              {t('party.title') || 'Party Games'}
            </h1>
            <span className="text-4xl">🎉</span>
          </div>
          <p className="font-neo-body text-neo-cream/80 text-sm uppercase tracking-widest mb-3">
            {t('party.subtitle') || 'Grab your phones!'}
          </p>
          {/* Admin preview banner */}
          <div className="inline-flex items-center gap-2 bg-neo-lime/10 border-2 border-neo-lime rounded-neo px-4 py-1.5 mb-6">
            <span className="text-neo-lime text-xs font-bold uppercase tracking-widest">Admin Preview</span>
            <span className="text-neo-lime/60 text-xs">·</span>
            <span className="text-neo-lime/80 text-xs">Host = TV screen · Players join on phone</span>
          </div>
        </div>

        {/* Game Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
          {GAME_LIST.map((game) => {
            const meta = GAME_META[game.id];
            return (
              <button
                type="button"
                key={game.id}
                onClick={() => handleSelectGame(game.id)}
                className={`
                  ${meta.bg} ${meta.border} ${meta.shadow}
                  border-3 rounded-neo-lg
                  p-5 text-start
                  transition-all duration-75
                  hover:-translate-y-1 hover:shadow-[6px_6px_0px_#000]
                  active:translate-y-[2px] active:translate-x-[2px] active:shadow-[2px_2px_0px_#000]
                  group relative overflow-hidden
                `}
              >
                {/* Game type tag */}
                <div className="flex items-start justify-between mb-3">
                  <span className={`${meta.tagBg} ${meta.tagText} text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-neo`}>
                    {meta.typeLabel}
                  </span>
                  <span className={`font-neo-body text-[11px] ${meta.accentText} opacity-70`}>
                    {game.minPlayers}–{game.maxPlayers}p
                  </span>
                </div>

                {/* Icon */}
                <div className="text-5xl mb-2 group-hover:scale-110 transition-transform duration-75">
                  {game.icon}
                </div>

                {/* Name */}
                <h2 className={`font-neo-display text-xl uppercase tracking-tight ${meta.accentText} mb-1`}>
                  {t(game.nameKey) || game.id}
                </h2>

                {/* Description */}
                <p className={`font-neo-body text-sm ${meta.accentText} opacity-75 mb-3`}>
                  {t(game.descriptionKey) || meta.mechanic}
                </p>

                {/* Flow steps */}
                <div className="flex items-center gap-1.5">
                  {meta.stepEmojis.map((emoji, i) => (
                    <span key={i} className="text-sm leading-none">
                      {emoji}
                      {i < meta.stepEmojis.length - 1 && (
                        <span className={`text-[10px] ${meta.accentText} opacity-40 mx-0.5`}>›</span>
                      )}
                    </span>
                  ))}
                </div>

                {/* Rounds hint */}
                <div className={`mt-3 pt-3 border-t border-neo-black/20 flex items-center justify-between`}>
                  <span className={`font-neo-body text-[11px] ${meta.accentText} opacity-60`}>
                    {game.defaultRounds} rounds · {game.defaultRoundTime}s/round
                  </span>
                  <span className={`font-neo-display text-sm ${meta.accentText} uppercase`}>
                    Host →
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* How-to row */}
        <div className="bg-neo-navy-elevated border-3 border-neo-cream/15 rounded-neo-lg p-4 mb-6">
          <div className="grid grid-cols-3 gap-4 text-center">
            {[
              { emoji: '📺', label: 'TV shows the game' },
              { emoji: '📱', label: 'Phones are controllers' },
              { emoji: '🔗', label: 'Share room code or QR' },
            ].map(({ emoji, label }) => (
              <div key={label} className="flex flex-col items-center gap-1">
                <span className="text-2xl">{emoji}</span>
                <span className="font-neo-body text-neo-cream/60 text-xs">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Join Existing Room */}
        <div className="bg-neo-navy-elevated border-3 border-neo-cream/20 rounded-neo-lg shadow-hard p-5">
          <h3 className="font-neo-display text-neo-white text-base uppercase mb-3">
            {t('party.joinRoom') || 'Join a Room'}
          </h3>
          <div className="flex gap-3">
            <input
              type="text"
              aria-label={t('party.enterCode') || 'Room code'}
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder={t('party.enterCode') || 'ROOM CODE'}
              maxLength={6}
              className="
                flex-1 bg-neo-navy border-3 border-neo-cream/30 rounded-neo
                px-4 py-3 text-neo-white font-neo-display text-xl text-center
                uppercase tracking-[0.3em]
                placeholder:text-neo-white/30 placeholder:tracking-[0.2em]
                focus:outline-hidden focus:border-neo-lime
                transition-colors
              "
            />
            <button
              type="button"
              onClick={handleJoinRoom}
              disabled={joinCode.trim().length < 4}
              className="
                bg-neo-lime border-3 border-neo-black rounded-neo shadow-hard
                px-6 py-3 font-neo-display text-neo-black uppercase font-bold
                transition-all duration-75
                hover:-translate-y-px hover:shadow-hard-lg
                active:translate-x-[2px] active:translate-y-[2px] active:shadow-hard-pressed
                disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:translate-y-0
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
