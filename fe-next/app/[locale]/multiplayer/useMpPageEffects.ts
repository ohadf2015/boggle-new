'use client';

/**
 * Side effects of the multiplayer page that react to state but own none:
 * result/roster sounds, series bookkeeping, music phases, the SPED audio-cue
 * nudge and the room-language toast. Split out of PageClient (FOUNDATION
 * 2026-09-26); bodies moved verbatim.
 */
import { useEffect, useRef } from 'react';
import type { Socket } from 'socket.io-client';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { useMusic } from '@/contexts/MusicContext';
import { neoInfoToast } from '@/components/NeoToast';
import { resolveMultiplayerMusicTrack } from './multiplayerMusic';
import type { useMultiplayerSounds } from '@/hooks/useMultiplayerSounds';
import type { useSeriesTracker } from '@/hooks/useSeriesTracker';
import type { useMultiplayerGameFlow } from '@/hooks/useMultiplayerGameFlow';
import type { Language } from '@/shared/types/game';

export interface MpPageEffectsInput {
  socket: Socket | null;
  t: (key: string, params?: Record<string, string | number>) => string;
  username: string;
  isActive: boolean;
  gameCode: string;
  showResults: boolean;
  resultsData: ReturnType<typeof useMultiplayerGameFlow>['resultsData'];
  showStartAnimation: boolean;
  playersInRoom: Array<{ username: string }>;
  mpSounds: ReturnType<typeof useMultiplayerSounds>;
  seriesTracker: ReturnType<typeof useSeriesTracker>;
  audioCuesActive: boolean;
  setRoomLanguage: (l: Language) => void;
}

export function useMpPageEffects({
  socket, t, username, isActive, gameCode, showResults, resultsData, showStartAnimation,
  playersInRoom, mpSounds, seriesTracker, audioCuesActive, setRoomLanguage,
}: MpPageEffectsInput): void {
  const { playTrack, TRACKS } = useMusic();
  const { sfxMuted, toggleSfxMute } = useSoundEffects();

  // SPED audio-cue accommodation: the room asks for sound nudged ON. Applied
  // once per game start and only ever as an UNMUTE — a student's own mute tap
  // afterwards always wins (the teacher's nudge never re-fires mid-round).
  useEffect(() => {
    if (audioCuesActive && sfxMuted) toggleSfxMute();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one nudge per game start, not per mute toggle
  }, [audioCuesActive]);

  // Listen for room language changes (host changed the game dictionary language)
  useEffect(() => {
    if (!socket) return;
    const handleRoomLanguageChanged = (data: { language: Language; changedBy: string }) => {
      setRoomLanguage(data.language);
      neoInfoToast(t('hostView.languageChangedNotification', { name: data.changedBy, language: t(`joinView.${data.language === 'en' ? 'english' : data.language === 'he' ? 'hebrew' : data.language === 'sv' ? 'swedish' : data.language === 'ja' ? 'japanese' : data.language === 'es' ? 'spanish' : 'russian'}`) }));
    };
    socket.on('roomLanguageChanged', handleRoomLanguageChanged);
    return () => { socket.off('roomLanguageChanged', handleRoomLanguageChanged); };
  }, [socket, t, setRoomLanguage]);

  // Sound: game over — victory if first place, defeat otherwise
  useEffect(() => {
    if (!showResults || !resultsData?.scores?.length) return;
    const myRank = resultsData.scores.findIndex(s => s.username === username);
    if (myRank === 0) mpSounds.onVictory(true);
    else mpSounds.onDefeat();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showResults]);

  // Sound: roster changes — a join/leave cue when the player set changes (party
  // lobby feel). Diff against the previous username set so it fires ONCE per real
  // change, never on the initial population (null sentinel) or on presence/focus-
  // only updateUsers pings (same members → no diff). mpSounds callbacks are
  // useCallback-stable so depending only on playersInRoom is correct.
  const prevRosterRef = useRef<Set<string> | null>(null);
  useEffect(() => {
    const current = new Set(playersInRoom.map(p => p.username));
    const prev = prevRosterRef.current;
    prevRosterRef.current = current;
    if (!prev) return; // first population — don't replay a burst of joins
    let added = false;
    let removed = false;
    for (const u of current) if (!prev.has(u)) { added = true; break; }
    for (const u of prev) if (!current.has(u)) { removed = true; break; }
    if (added) mpSounds.onPlayerJoined();
    if (removed) mpSounds.onPlayerLeft();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playersInRoom]);

  // Series tracking
  useEffect(() => {
    if (showResults && resultsData?.scores) seriesTracker.recordRound(resultsData.scores, resultsData.gameSessionId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showResults, resultsData?.scores]);

  // Only reset series when user truly leaves the room (gameCode cleared),
  // not on transient isActive=false from reconnectable disconnects
  useEffect(() => {
    if (!isActive && !gameCode) seriesTracker.reset();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, gameCode]);

  // Music transitions: lobby → countdown bed → in-game track. The third phase
  // (inGame) was missing before — the countdown bed leaked through the whole
  // round, so the in-game music never replaced the lobby/homepage vibe.
  useEffect(() => {
    const next = resolveMultiplayerMusicTrack({ isActive, showResults, showStartAnimation });
    if (!next) return;
    playTrack(TRACKS[next === 'inGame' ? 'IN_GAME' : next === 'beforeGame' ? 'BEFORE_GAME' : 'LOBBY']);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, showResults, showStartAnimation]);
}
