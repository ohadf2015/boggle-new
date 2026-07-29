'use client';

/**
 * Party Player View — the phone controller.
 * Shows private input (captions, drawings, votes, role cards).
 * Minimal chrome — the game happens on the TV and in the room.
 */

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useHideNavigation } from '@/contexts/NavigationContext';
import { useFeatureFlag } from '@/hooks/useFeatureFlag';
import { usePartySocket } from '@/hooks/usePartySocket';
import { PARTY_GAMES, type PartyGameId } from '@/shared/types/partyGame';
import dynamic from 'next/dynamic';
import { GameLoadingFallback } from '@/components/ui/GameLoadingFallback';

const CaptionClashPhone = dynamic(() => import('@/components/party/caption-clash/CaptionClashPhone'), { ssr: false, loading: () => <GameLoadingFallback /> });
const PixelClashPhone = dynamic(() => import('@/components/party/pixel-clash/PixelClashPhone'), { ssr: false, loading: () => <GameLoadingFallback /> });
const ShadowClashPhone = dynamic(() => import('@/components/party/shadow-clash/ShadowClashPhone'), { ssr: false, loading: () => <GameLoadingFallback /> });

export default function PartyPlayClient() {
  const params = useParams();
  const searchParams = useSearchParams();
  const gameId = params?.gameId as PartyGameId;
  const roomCode = searchParams?.get('code') || '';
  const { user, profile } = useAuth();
  const { t } = useLanguage();
  const { enabled: flagEnabled, loading: flagLoading } = useFeatureFlag('party_games_alpha', user?.id);
  const hasAccess = flagEnabled || process.env.NODE_ENV === 'development';

  const {
    room,
    gameState,
    playerId,
    isHost,
    isSpectator,
    connected,
    error,
    joinRoom,
    sendInput,
    socket,
  } = usePartySocket(user?.id, hasAccess);

  const [joined, setJoined] = useState(false);
  const gameDef = PARTY_GAMES[gameId];

  // Stable guest name for anonymous players (generated once)
  const [guestName] = useState(() => `Player-${Math.random().toString(36).slice(2, 6).toUpperCase()}`);
  const playerName = profile?.username || guestName;

  // Auto-join room on mount
  useEffect(() => {
    if (!joined && connected && hasAccess && roomCode) {
      joinRoom(roomCode, playerName, {
        avatarImage: profile?.avatar_image || undefined,
      });
      setJoined(true);
    }
  }, [joined, connected, hasAccess, roomCode, playerName, joinRoom, profile?.avatar_image]);

  const setIsInGame = useHideNavigation();
  useEffect(() => {
    const phase = room?.phase;
    setIsInGame(Boolean(phase) && phase !== 'lobby');
    return () => setIsInGame(false);
  }, [room?.phase, setIsInGame]);

  if (flagLoading) {
    return (
      <div className="min-h-screen bg-neo-navy flex items-center justify-center">
        <div className="animate-pulse text-neo-white font-neo-display">
          {t('common.loading') || 'Loading...'}
        </div>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-neo-navy flex items-center justify-center p-4">
        <div className="text-neo-white font-neo-body text-center">
          {t('party.noAccess') || 'Not available'}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-neo-navy flex items-center justify-center p-4">
        <div className="bg-neo-red/20 border-3 border-neo-red rounded-neo p-4 text-center max-w-sm">
          <p className="text-neo-red font-neo-display uppercase">{error}</p>
        </div>
      </div>
    );
  }

  // Waiting to join
  if (!room) {
    return (
      <div className="min-h-screen bg-neo-navy flex items-center justify-center">
        <div className="text-center">
          <div className="animate-pulse text-neo-white font-neo-display text-lg">
            {t('party.joining') || 'Joining...'}
          </div>
          {roomCode && (
            <div className="mt-2 text-neo-white font-neo-body text-sm">
              Room: {roomCode}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Lobby — phone shows "waiting for host to start"
  if (room.phase === 'lobby') {
    const playerCount = Object.keys(room.players).length;
    return (
      <div className="min-h-screen bg-neo-navy flex flex-col items-center justify-center p-4">
        <div className="text-6xl mb-4">{gameDef?.icon || ''}</div>
        <h1 className="font-neo-display text-neo-white text-2xl uppercase">
          {t(gameDef?.nameKey || '') || room.gameId}
        </h1>
        <div className="mt-4 bg-neo-navy-elevated border-3 border-neo-cream/30 rounded-neo p-4 text-center">
          <p className="text-neo-white font-neo-display text-lg">
            {room.roomCode}
          </p>
          <p className="text-neo-white font-neo-body text-sm mt-1">
            {playerCount} {t('party.playersJoined') || 'players joined'}
          </p>
        </div>
        <div className="mt-6 animate-pulse text-neo-white font-neo-body text-sm">
          {isSpectator
            ? (t('party.spectating') || 'Spectating...')
            : (t('party.waitingForHost') || 'Waiting for host to start...')}
        </div>
      </div>
    );
  }

  // Playing — game-specific phone views
  if (room.gameId === 'shadow-clash') {
    return (
      <ShadowClashPhone
        socket={socket}
        onSendInput={(input) => sendInput(input as unknown as Parameters<typeof sendInput>[0])}
      />
    );
  }

  if (room.gameId === 'pixel-clash') {
    return (
      <PixelClashPhone
        socket={socket}
        playerId={playerId}
        isSpectator={isSpectator}
        onSendInput={(input) => sendInput(input as unknown as Parameters<typeof sendInput>[0])}
      />
    );
  }

  if (room.gameId === 'caption-clash') {
    return (
      <CaptionClashPhone
        socket={socket}
        playerId={playerId}
        isSpectator={isSpectator}
        onSendInput={(input) => sendInput(input as unknown as Parameters<typeof sendInput>[0])}
      />
    );
  }

  // Placeholder for other games (Sprint 2-3)
  return (
    <div className="min-h-screen bg-neo-navy flex flex-col items-center justify-center p-4">
      <div className="text-4xl mb-3">{gameDef?.icon || ''}</div>
      <p className="text-neo-white font-neo-display uppercase">
        {room.phase}
      </p>
      <p className="text-neo-white font-neo-body text-sm mt-2">
        Phone controller coming in Sprint 2-3
      </p>
      {isSpectator && (
        <div className="mt-4 bg-neo-purple/20 border-2 border-neo-purple rounded-neo px-3 py-1">
          <span className="text-neo-purple text-xs font-bold uppercase">Spectator</span>
        </div>
      )}
    </div>
  );
}
