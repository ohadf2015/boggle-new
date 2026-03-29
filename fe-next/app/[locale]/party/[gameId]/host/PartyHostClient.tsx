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

const CaptionClashTv = dynamic(() => import('@/components/party/caption-clash/CaptionClashTv'), { ssr: false });
const PixelClashTv = dynamic(() => import('@/components/party/pixel-clash/PixelClashTv'), { ssr: false });
const ShadowClashTv = dynamic(() => import('@/components/party/shadow-clash/ShadowClashTv'), { ssr: false });

export default function PartyHostClient() {
  const params = useParams();
  const gameId = params?.gameId as PartyGameId;
  const { user, profile } = useAuth();
  const { t } = useLanguage();
  const { enabled: hasAccess, loading: flagLoading } = useFeatureFlag('party_games_alpha', user?.id);

  const {
    room,
    gameState,
    playerId,
    isHost,
    connected,
    error,
    roundResults,
    gameResults,
    createRoom,
    startGame,
    sendInput,
    socket,
  } = usePartySocket(user?.id, hasAccess);

  const [roomCreated, setRoomCreated] = useState(false);
  const gameDef = PARTY_GAMES[gameId];

  // Auto-create room on mount
  useEffect(() => {
    if (!roomCreated && connected && hasAccess && gameDef && profile?.username) {
      createRoom(gameId, `${profile.username}'s game`, profile.username, {
        avatarImage: profile.avatar_image || undefined,
      });
      setRoomCreated(true);
    }
  }, [roomCreated, connected, hasAccess, gameDef, profile, gameId, createRoom]);

  if (flagLoading) {
    return (
      <div className="min-h-screen bg-neo-abyss flex items-center justify-center">
        <div className="animate-pulse text-neo-cream font-neo-display text-xl">
          {t('common.loading') || 'Loading...'}
        </div>
      </div>
    );
  }

  if (!hasAccess || !gameDef) {
    return (
      <div className="min-h-screen bg-neo-abyss flex items-center justify-center">
        <div className="text-neo-cream/50 font-neo-body text-center">
          {t('party.noAccess') || 'Not available'}
        </div>
      </div>
    );
  }

  // Lobby phase — show QR code and player list
  if (!room || room.phase === 'lobby') {
    return (
      <PartyTvLobby
        room={room}
        gameDef={gameDef}
        isHost={isHost}
        onStartGame={startGame}
        error={error}
      />
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
          <h1 className="font-neo-display text-neo-cream text-3xl uppercase">
            {t(gameDef.nameKey) || gameId}
          </h1>
          <p className="text-neo-cream/50 font-neo-body mt-2">
            Round {room.round}/{room.totalRounds} — {room.phase}
          </p>
          <p className="text-neo-cream/30 font-neo-body text-sm mt-4">
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
        <p className="text-neo-cream/50 mt-2">Results view coming in Sprint 4</p>
      </div>
    </div>
  );
}
