'use client';

/**
 * JoinRedirectClient — Takes a room code from URL params,
 * connects to socket, discovers the gameId, and joins the room directly.
 * No redirect needed — this page IS the phone controller.
 */

import { useEffect, useState, type ReactNode } from 'react';
import { useSearchParams, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePartySocket } from '@/hooks/usePartySocket';
import { PARTY_GAMES, type PartyGameId, type PartyInput } from '@/shared/types/partyGame';
import dynamic from 'next/dynamic';
import { GameLoadingFallback } from '@/components/ui/GameLoadingFallback';
import { TopBackLink } from '@/components/navigation/TopBackLink';

const CaptionClashPhone = dynamic(() => import('@/components/party/caption-clash/CaptionClashPhone'), { ssr: false, loading: () => <GameLoadingFallback /> });
const PixelClashPhone = dynamic(() => import('@/components/party/pixel-clash/PixelClashPhone'), { ssr: false, loading: () => <GameLoadingFallback /> });
const ShadowClashPhone = dynamic(() => import('@/components/party/shadow-clash/ShadowClashPhone'), { ssr: false, loading: () => <GameLoadingFallback /> });

export default function JoinRedirectClient() {
  const searchParams = useSearchParams();
  const params = useParams();
  const locale = params?.locale as string || 'en';
  const roomCode = searchParams?.get('code') || '';
  const { user, profile } = useAuth();
  const { t } = useLanguage();

  // Always enabled in join flow (no feature flag check for players)
  const {
    room,
    playerId,
    isSpectator,
    connected,
    error,
    joinRoom,
    sendInput,
    socket,
  } = usePartySocket(user?.id, true);

  const [joined, setJoined] = useState(false);
  const [manualCode, setManualCode] = useState(roomCode);

  // Stable guest name
  const [guestName] = useState(() => `Player-${Math.random().toString(36).slice(2, 6).toUpperCase()}`);
  const playerName = profile?.username || guestName;

  // Auto-join if code is in URL
  useEffect(() => {
    if (!joined && connected && roomCode) {
      joinRoom(roomCode, playerName, {
        avatarImage: profile?.avatar_image || undefined,
      });
      setJoined(true);
    }
  }, [joined, connected, roomCode, playerName, joinRoom, profile?.avatar_image]);

  const handleManualJoin = () => {
    if (manualCode.trim().length >= 4 && connected) {
      joinRoom(manualCode.trim().toUpperCase(), playerName, {
        avatarImage: profile?.avatar_image || undefined,
      });
      setJoined(true);
    }
  };

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-neo-navy flex items-center justify-center p-4">
        <div className="bg-neo-red/20 border-3 border-neo-red rounded-neo p-4 text-center max-w-sm">
          <p className="text-neo-red font-neo-display uppercase mb-2">{error}</p>
          <button type="button"
            onClick={() => { setJoined(false); window.location.reload(); }}
            className="text-neo-white text-sm underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  // No code — show manual entry
  if (!roomCode && !room) {
    return (
      <div className="min-h-screen bg-neo-navy flex flex-col items-center justify-center p-4">
        <TopBackLink className="mb-4" />
        <h1 className="font-neo-display text-neo-white text-2xl uppercase mb-4">
          {t('party.joinRoom')}
        </h1>
        <input
          type="text"
          value={manualCode}
          onChange={(e) => setManualCode(e.target.value.toUpperCase())}
          placeholder={t('party.enterCode')}
          maxLength={6}
          className="
            bg-neo-navy-elevated border-3 border-neo-cyan/50 rounded-neo
            px-4 py-3 text-neo-white font-neo-display text-xl text-center
            uppercase tracking-[0.3em] mb-4 w-48
            placeholder:text-neo-white
            focus:outline-hidden focus:border-neo-cyan
          "
        />
        <button type="button"
          onClick={handleManualJoin}
          disabled={manualCode.trim().length < 4 || !connected}
          className="
            bg-neo-lime border-3 border-neo-black rounded-neo shadow-hard
            px-6 py-3 font-neo-display text-neo-black uppercase font-bold
            disabled:opacity-30 disabled:cursor-not-allowed
          "
        >
          {t('party.join')}
        </button>
        {!connected && (
          <p className="text-neo-white text-xs mt-2 animate-pulse">Connecting...</p>
        )}
      </div>
    );
  }

  // Waiting to join
  if (!room) {
    return (
      <div className="min-h-screen bg-neo-navy flex items-center justify-center">
        <div className="text-center">
          <div className="animate-pulse text-neo-white font-neo-display text-lg">
            {t('party.joining')}
          </div>
          <div className="mt-2 text-neo-white font-neo-body text-sm">
            Room: {roomCode || manualCode}
          </div>
        </div>
      </div>
    );
  }

  const gameDef = PARTY_GAMES[room.gameId as PartyGameId];

  // Lobby — waiting for host to start
  if (room.phase === 'lobby') {
    const playerCount = Object.keys(room.players).length;
    return (
      <div className="min-h-screen bg-neo-navy flex flex-col items-center justify-center p-4">
        <div className="text-6xl mb-4">{gameDef?.icon || '🎮'}</div>
        <h1 className="font-neo-display text-neo-white text-2xl uppercase">
          {gameDef ? t(gameDef.nameKey) : room.gameId}
        </h1>
        <div className="mt-4 bg-neo-navy-elevated border-3 border-neo-cream/30 rounded-neo p-4 text-center">
          <p className="text-neo-white font-neo-display text-lg">{room.roomCode}</p>
          <p className="text-neo-white font-neo-body text-sm mt-1">
            {playerCount} {t('party.playersJoined')}
          </p>
        </div>
        <div className="mt-6 animate-pulse text-neo-white font-neo-body text-sm">
          {isSpectator
            ? t('party.spectating')
            : t('party.waitingForHost')}
        </div>
      </div>
    );
  }

  // Playing — route to game-specific phone view. Constrain to a phone-width
  // column centered on a dark backdrop so the controller stays usable on wide
  // and landscape screens (a solo player may run it on a laptop), instead of a
  // textarea stretched edge-to-edge.
  let phoneView: ReactNode = null;
  if (room.gameId === 'pixel-clash') {
    phoneView = (
      <PixelClashPhone
        socket={socket}
        playerId={playerId}
        isSpectator={isSpectator}
        onSendInput={(input) => sendInput(input as PartyInput)}
      />
    );
  } else if (room.gameId === 'caption-clash') {
    phoneView = (
      <CaptionClashPhone
        socket={socket}
        playerId={playerId}
        isSpectator={isSpectator}
        onSendInput={(input) => sendInput(input as PartyInput)}
      />
    );
  } else if (room.gameId === 'shadow-clash') {
    phoneView = (
      <ShadowClashPhone
        socket={socket}
        onSendInput={(input) => sendInput(input as PartyInput)}
      />
    );
  }

  if (phoneView) {
    return (
      <div className="min-h-screen bg-neo-abyss flex justify-center">
        <div className="w-full max-w-md">{phoneView}</div>
      </div>
    );
  }

  // Fallback
  return (
    <div className="min-h-screen bg-neo-navy flex items-center justify-center p-4">
      <p className="text-neo-white font-neo-display uppercase">{room.phase}</p>
    </div>
  );
}
