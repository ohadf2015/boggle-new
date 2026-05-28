'use client';

/**
 * PartyTvLobby — TV screen during lobby phase.
 * Shows QR code, room code, player avatars, and start button.
 * Designed for big screen display (TV/projector).
 */

import { memo, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { useLanguage } from '@/contexts/LanguageContext';
import type { PartyGameDefinition } from '@/shared/types/partyGame';
import type { PartyRoomState } from '@/hooks/usePartySocket';

const QRCodeSVG = dynamic(
  () => import('qrcode.react').then((mod) => mod.QRCodeSVG),
  { ssr: false }
);

interface PartyTvLobbyProps {
  room: PartyRoomState | null;
  gameDef: PartyGameDefinition;
  isHost: boolean;
  onStartGame: () => void;
  error: string | null;
}

const ACCENT_MAP: Record<string, string> = {
  'neo-pink': 'text-neo-pink border-neo-pink',
  'neo-cyan': 'text-neo-cyan border-neo-cyan',
  'neo-purple': 'text-neo-purple border-neo-purple',
};

function PartyTvLobbyInner({ room, gameDef, isHost, onStartGame, error }: PartyTvLobbyProps) {
  const { t } = useLanguage();
  const accentClasses = ACCENT_MAP[gameDef.accentColor] || 'text-neo-lime border-neo-lime';

  const joinUrl = useMemo(() => {
    if (!room) return '';
    const base = typeof window !== 'undefined' ? window.location.origin : 'https://www.lexiclash.live';
    // Extract locale from current URL path
    const pathLocale = typeof window !== 'undefined'
      ? window.location.pathname.split('/')[1] || 'en'
      : 'en';
    return `${base}/${pathLocale}/party/join?code=${room.roomCode}`;
  }, [room]);

  const players = room ? Object.values(room.players) : [];
  const spectators = room ? Object.values(room.spectators) : [];
  const playerCount = players.length;
  const canStart = playerCount >= gameDef.minPlayers;

  return (
    <div className="min-h-screen bg-neo-abyss flex flex-col items-center justify-center p-8 relative overflow-hidden">
      {/* Background subtle grid */}
      <div className="absolute inset-0 opacity-5" style={{
        backgroundImage: 'linear-gradient(rgba(255,254,240,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,254,240,0.1) 1px, transparent 1px)',
        backgroundSize: '40px 40px',
      }} />

      <div className="relative z-10 w-full max-w-5xl">
        {/* Game Title */}
        <div className="text-center mb-8">
          <div className="text-7xl mb-3">{gameDef.icon}</div>
          <h1 className={`font-neo-display text-5xl uppercase tracking-tight ${accentClasses.split(' ')[0]}`}>
            {t(gameDef.nameKey) || gameDef.id}
          </h1>
        </div>

        {/* Room Code + QR */}
        <div className="flex items-center justify-center gap-12 mb-10">
          {/* QR Code */}
          <div className="bg-neo-cream rounded-neo-lg p-4 shadow-hard-lg border-3 border-neo-black">
            {joinUrl && <QRCodeSVG value={joinUrl} size={160} level="M" />}
          </div>

          {/* Room Code */}
          <div className="text-center">
            <p className="text-neo-white font-neo-body text-sm uppercase tracking-wider mb-2">
              {t('party.roomCode')}
            </p>
            <div className={`border-4 ${accentClasses.split(' ')[1]} rounded-neo-lg px-8 py-4 bg-neo-navy`}>
              <span data-selectable className={`font-neo-display text-6xl tracking-[0.4em] ${accentClasses.split(' ')[0]}`}>
                {room?.roomCode || '-----'}
              </span>
            </div>
            <p className="text-neo-white font-neo-body text-xs mt-2">
              {t('party.scanOrEnter')}
            </p>
          </div>
        </div>

        {/* Player Grid */}
        <div className="flex flex-wrap justify-center gap-4 mb-8">
          {players.map((p) => (
            <div
              key={p.socketId}
              className="bg-neo-navy-elevated border-3 border-neo-cream/30 rounded-neo-lg px-4 py-3 shadow-hard animate-neo-pop"
            >
              <span className="font-neo-display text-neo-white text-lg">
                {p.username}
              </span>
              {p.isHost && (
                <span className="ms-2 text-neo-lime text-xs font-bold uppercase">{t('party.host')}</span>
              )}
            </div>
          ))}

          {/* Empty slots */}
          {Array.from({ length: Math.max(0, gameDef.minPlayers - playerCount) }).map((_, i) => (
            <div
              key={`empty-${i}`}
              className="border-3 border-dashed border-neo-cream/15 rounded-neo-lg px-4 py-3 animate-pulse"
            >
              <span className="font-neo-body text-neo-white text-lg">
                {t('party.waiting')}
              </span>
            </div>
          ))}
        </div>

        {/* Player Count */}
        <p className="text-center text-neo-white font-neo-body text-sm mb-6">
          {playerCount}/{gameDef.maxPlayers} {t('party.players')}
          {spectators.length > 0 && ` + ${spectators.length} ${t('party.spectators')}`}
          {!canStart && (
            <span className="ms-2 text-neo-red">
              ({t('party.needMore')})
            </span>
          )}
        </p>

        {/* Start Button (host only) */}
        {isHost && (
          <div className="text-center">
            <button
              onClick={onStartGame}
              disabled={!canStart}
              className={`
                bg-neo-lime border-3 border-neo-black rounded-neo-lg shadow-hard-lg
                px-12 py-4 font-neo-display text-neo-black text-2xl uppercase
                transition-all duration-100
                hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-hard-xl
                active:translate-x-[2px] active:translate-y-[2px] active:shadow-hard-pressed
                disabled:opacity-30 disabled:cursor-not-allowed
                disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:shadow-hard-lg
              `}
            >
              {t('party.startGame') || 'Start Game'}
            </button>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mt-4 text-center">
            <p className="text-neo-red font-neo-body text-sm">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}

const PartyTvLobby = memo(PartyTvLobbyInner);
PartyTvLobby.displayName = 'PartyTvLobby';
export default PartyTvLobby;
