'use client';

/**
 * Party Host View — the TV/shared screen.
 * Shows QR code in lobby, game content during play, results at end.
 * This is the screen projected on a TV or shared monitor.
 */

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useFeatureFlag } from '@/hooks/useFeatureFlag';
import { usePartySocket } from '@/hooks/usePartySocket';
import { PARTY_GAMES, type PartyGameId } from '@/shared/types/partyGame';
import PartyTvLobby from '@/components/party/shared/PartyTvLobby';
import dynamic from 'next/dynamic';
import { GameLoadingFallback } from '@/components/ui/GameLoadingFallback';

const CaptionClashTv = dynamic(() => import('@/components/party/caption-clash/CaptionClashTv'), { ssr: false, loading: () => <GameLoadingFallback /> });
const PixelClashTv = dynamic(() => import('@/components/party/pixel-clash/PixelClashTv'), { ssr: false, loading: () => <GameLoadingFallback /> });
const ShadowClashTv = dynamic(() => import('@/components/party/shadow-clash/ShadowClashTv'), { ssr: false, loading: () => <GameLoadingFallback /> });

export default function PartyHostClient() {
  const params = useParams();
  const gameId = params?.gameId as PartyGameId;
  const { user, profile } = useAuth();
  const { t } = useLanguage();
  const { enabled: flagEnabled, loading: flagLoading } = useFeatureFlag('party_games_alpha', user?.id);
  const hasAccess = flagEnabled || process.env.NODE_ENV === 'development';

  const {
    room,
    isHost,
    connected,
    error,
    createRoom,
    startGame,
    socket,
  } = usePartySocket(user?.id, hasAccess);

  const [roomCreated, setRoomCreated] = useState(false);
  const gameDef = PARTY_GAMES[gameId];

  // Stable guest name for anonymous hosts (generated once)
  const [guestName] = useState(() => `Host-${Math.random().toString(36).slice(2, 6).toUpperCase()}`);
  const hostName = profile?.username || guestName;

  // Auto-create room on mount
  useEffect(() => {
    if (!roomCreated && connected && hasAccess && gameDef) {
      createRoom(gameId, `${hostName}'s game`, hostName, {
        avatarImage: profile?.avatar_image || undefined,
      });
      setRoomCreated(true);
    }
  }, [roomCreated, connected, hasAccess, gameDef, hostName, gameId, createRoom, profile?.avatar_image]);

  if (flagLoading) {
    return (
      <div className="min-h-screen bg-neo-abyss flex items-center justify-center">
        <div className="animate-pulse text-neo-white font-neo-display text-xl">
          {t('common.loading') || 'Loading...'}
        </div>
      </div>
    );
  }

  if (!hasAccess || !gameDef) {
    return (
      <div className="min-h-screen bg-neo-abyss flex items-center justify-center">
        <div className="text-neo-white font-neo-body text-center">
          {t('party.noAccess') || 'Not available'}
        </div>
      </div>
    );
  }

  // Lobby phase — show QR code and player list
  if (!room || room.phase === 'lobby') {
    // Debug overlay in dev
    const debugInfo = process.env.NODE_ENV === 'development' ? (
      <div className="fixed top-2 left-2 z-50 bg-black/80 text-xs text-neo-white font-mono p-2 rounded max-w-xs">
        <div>connected: {String(connected)}</div>
        <div>hasAccess: {String(hasAccess)}</div>
        <div>username: {profile?.username || 'null'}</div>
        <div>user: {user?.id ? user.id.slice(0, 8) + '...' : 'null'}</div>
        <div>roomCreated: {String(roomCreated)}</div>
        <div>room: {room ? room.roomCode : 'null'}</div>
        <div>error: {error || 'none'}</div>
        <div>gameId: {gameId}</div>
      </div>
    ) : null;

    return (
      <>
        {debugInfo}
        <PartyTvLobby
          room={room}
          gameDef={gameDef}
          isHost={isHost}
          onStartGame={startGame}
          error={error}
        />
      </>
    );
  }

  // Playing phase — game-specific TV views
  if (room.phase === 'playing' || room.phase === 'voting' || room.phase === 'reveal') {
    if (room.gameId === 'caption-clash') {
      return <CaptionClashTv socket={socket} roomCode={room.roomCode} />;
    }
    if (room.gameId === 'pixel-clash') {
      return <PixelClashTv socket={socket} />;
    }
    if (room.gameId === 'shadow-clash') {
      return <ShadowClashTv socket={socket} />;
    }

    // Placeholder for other games (Sprint 2-3)
    return (
      <div className="min-h-screen bg-neo-abyss flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">{gameDef.icon}</div>
          <h1 className="font-neo-display text-neo-white text-3xl uppercase">
            {t(gameDef.nameKey) || gameId}
          </h1>
          <p className="text-neo-white font-neo-body mt-2">
            Round {room.round}/{room.totalRounds} — {room.phase}
          </p>
          <p className="text-neo-white font-neo-body text-sm mt-4">
            Game view coming in Sprint 2-3
          </p>
        </div>
      </div>
    );
  }

  // Results phase
  return (
    <div className="min-h-screen bg-neo-abyss flex items-center justify-center">
      <div className="text-center">
        <h1 className="font-neo-display text-neo-lime text-4xl uppercase">
          {t('party.gameOver') || 'Game Over!'}
        </h1>
        <p className="text-neo-white mt-2">Results view coming in Sprint 4</p>
      </div>
    </div>
  );
}
