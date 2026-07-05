'use client';

import React, { memo, useState, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { m, AnimatePresence } from 'framer-motion';
const CrazyGamesBanner = dynamic(() => import('@/components/CrazyGamesBanner'), { ssr: false });
import { Users, Crown, Bot, LogOut, Plus, Check, Pencil, X, Camera, Zap } from 'lucide-react';
import Avatar from '../../components/Avatar';
import AvatarBuilderModal from '../../components/avatar/AvatarBuilderModal';
import { useAvatarPremium } from '@/hooks/useAvatarPremium';
import { LobbyRewardCluster } from '@/components/lobby/LobbyRewardCluster';
import { LobbyDailyEmber } from '@/components/lobby/LobbyDailyEmber';
import { LobbyAutoStartStatus } from '@/components/lobby/LobbyAutoStartStatus';
import { QuickLanguageSwitcher } from '@/components/QuickLanguageSwitcher';
import RoomChat from '../../components/RoomChat';
import { LobbyTutorialPanel } from '../../components/lobby/LobbyTutorialPanel';
import { EmoteTray } from './lobby/EmoteTray';
import { useSocketOptional } from '@/utils/SocketContext';
import { useLobbyEmotes } from '@/hooks/useLobbyEmotes';
import { useLobbyAdGate } from '@/hooks/useLobbyAdGate';
import { useCrazyGames } from '@/components/CrazyGamesSDK';
import { MobileShareSection } from '../../host/components/pre-game/MobileShareSection';
import { DesktopLobbyLayout, InviteCard } from '../../host/components/pre-game/desktop';
// Shared how-to-play source — host renders the same component, so players and
// host see IDENTICAL instructions (all modes incl. wheel-rush, localized images,
// a11y). Previously the player inlined a degraded 3-mode/no-image copy.
import { GameInstructions } from '../../host/components/pre-game/GameInstructions';
import type { GameModeOption } from '@/components/GameModeSelector';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../../components/ui/alert-dialog';
import { cn } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';
import { getOrCreateStoredCustomAvatar, setStoredCustomAvatar } from '@/utils/profileStorage';
import { type CustomAvatarConfig } from '@/shared/types/customAvatar';
import { useGameMode } from '@/hooks/gameState';
import { LANGUAGE_FLAGS, getLanguageName } from '@/lib/languageConfig';
import { SPRING_PRESETS } from '@/lib/animation/presets';
import type { Language, Avatar as AvatarType, PresenceStatus } from '@/shared/types/game';

// ==================== Types ====================

interface PlayerReadyInfo {
  username: string;
  avatar?: AvatarType;
  isHost?: boolean;
  isBot?: boolean;
  presenceStatus?: PresenceStatus;
  isWindowFocused?: boolean;
}

interface PlayerWaitingViewProps {
  gameCode: string;
  gameLanguage: Language | null;
  username: string;
  t: (path: string, params?: Record<string, string | number>) => string;
  playersReady: (string | PlayerReadyInfo)[];
  showQR: boolean;
  setShowQR: (show: boolean) => void;
  showExitConfirm: boolean;
  setShowExitConfirm: (show: boolean) => void;
  onExitRoom: () => void;
  onConfirmExit: () => void;
  onNameChange?: (newName: string) => void;
  onAvatarChange?: (config: CustomAvatarConfig) => void;
  /** Usernames the server reports as ready (non-host). Drives roster badges. */
  readyUsernames?: string[];
  /** Whether the local player is ready. */
  isReady?: boolean;
  /** Toggle local ready state (emits `lobbyReady`). Absent on host/spectator. */
  onToggleReady?: () => void;
}

const MAX_PLAYERS = 8;

// ==================== Component ====================

const PlayerWaitingView: React.FC<PlayerWaitingViewProps> = ({
  gameCode,
  gameLanguage,
  username,
  t,
  playersReady,
  showExitConfirm,
  setShowExitConfirm,
  onExitRoom,
  onConfirmExit,
  onNameChange,
  onAvatarChange,
  readyUsernames = [],
  isReady = false,
  onToggleReady,
}): React.ReactElement => {
  const { isAuthenticated, updateProfile } = useAuth();
  const { isOnCrazyGamesPlatform } = useCrazyGames();
  const gameMode = useGameMode();

  // Lobby emotes — self-contained over the shared socket (no prop threading).
  // The server echoes every emote to the whole room (sender included), so the
  // sender's own avatar face-swap uses the same canonical username as its tile.
  const socketCtx = useSocketOptional();
  const { emotesByUsername, sendEmote, cooldownActive } = useLobbyEmotes({
    socket: socketCtx?.socket ?? null,
  });
  // Broadcast this guest's rewarded-ad state so the host's Start disables while
  // they watch (return value unused here — guests don't gate anything).
  useLobbyAdGate({ socket: socketCtx?.socket ?? null });

  // The server-owned auto-start countdown (1Hz `lobbyAutoStartTick`) lives in
  // <LobbyAutoStartStatus/>, a memoized leaf — keeping it out of this component
  // so the whole 8-avatar lobby tree no longer re-renders once per second.

  const [isAvatarBuilderOpen, setIsAvatarBuilderOpen] = useState(false);
  const avatarPremium = useAvatarPremium();
  const [currentAvatar, setCurrentAvatar] = useState<CustomAvatarConfig>(() => getOrCreateStoredCustomAvatar());

  const handleAvatarSave = useCallback(async (config: CustomAvatarConfig) => {
    setStoredCustomAvatar(config);
    setCurrentAvatar(config);
    onAvatarChange?.(config);
    setIsAvatarBuilderOpen(false);
    await updateProfile({ avatar_config: config }).catch(() => {});
  }, [onAvatarChange, updateProfile]);

  const nonHostPlayers = playersReady;
  const emptySlots = Math.max(0, Math.min(5, MAX_PLAYERS) - nonHostPlayers.length);

  // Ready-state lookups for roster badges + the "N/M ready" status line.
  // Bots auto-count as ready; host clicks Start (never "Ready") so is excluded.
  // Memoized so unrelated re-renders don't rebuild the Set / re-scan the roster
  // and so child props keep stable references.
  const readySet = useMemo(() => new Set(readyUsernames), [readyUsernames]);
  const readyTotal = useMemo(() => nonHostPlayers.filter((p) => {
    const o = typeof p === 'object' ? p : null;
    return !o?.isHost && !o?.isBot;
  }).length, [nonHostPlayers]);
  const readyCount = useMemo(() => nonHostPlayers.filter((p) => {
    const o = typeof p === 'object' ? p : null;
    const nm = typeof p === 'string' ? p : p.username;
    // Match server `getPlayersReadyCount`: humans only, host + bots excluded.
    if (o?.isHost || o?.isBot) return false;
    return readySet.has(nm);
  }).length, [nonHostPlayers, readySet]);

  const [isEditingName, setIsEditingName] = useState(false);
  const [editNameValue, setEditNameValue] = useState(username);

  const handleSaveName = useCallback(() => {
    const trimmed = editNameValue.trim();
    if (trimmed && trimmed !== username) {
      onNameChange?.(trimmed);
    }
    setIsEditingName(false);
  }, [editNameValue, username, onNameChange]);

  // ==================== Hero Card ====================
  const renderHeroCard = (): React.ReactElement => (
    <m.div
      data-testid="waiting-status"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={SPRING_PRESETS.balanced}
      className="rounded-neo-lg border-3 border-neo-black bg-slate-800/80 shadow-hard-lg overflow-hidden"
    >
      <div className="h-1.5 bg-linear-to-r from-neo-cyan via-neo-pink to-neo-lime" />

      <div className="p-4 sm:p-5 flex items-center gap-4 sm:gap-5">
        {/* Large clickable avatar */}
        <button
          type="button"
          data-testid="edit-avatar-button"
          onClick={() => setIsAvatarBuilderOpen(true)}
          className="relative shrink-0 group"
        >
          <div className="w-20 h-20 rounded-full border-3 border-neo-black overflow-hidden shadow-hard ring-2 ring-neo-lime ring-offset-2 ring-offset-slate-800 transition-transform group-hover:scale-105 group-active:scale-95">
            <Avatar
              customAvatar={currentAvatar}
              size="2xl"
              className="w-full h-full"
            />
          </div>
          <div className="absolute inset-0 rounded-full bg-neo-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <Camera className="w-6 h-6 text-neo-cream" />
          </div>
          <div className="absolute -bottom-1 -inset-e-1 w-7 h-7 rounded-full bg-neo-cyan border-2 border-neo-black shadow-hard-sm flex items-center justify-center">
            <Pencil className="w-3.5 h-3.5 text-neo-black" />
          </div>
        </button>

        {/* Name + status */}
        <div className="flex-1 min-w-0">
          {isEditingName ? (
            <div className="flex items-center gap-2">
              <input
                data-testid="name-edit-input"
                type="text"
                value={editNameValue}
                onChange={(e) => setEditNameValue(e.target.value)}
                maxLength={20}
                className="bg-white/10 text-neo-cream border-2 border-neo-black rounded-neo px-3 py-1.5 text-lg font-black focus:outline-hidden focus:ring-2 focus:ring-neo-cyan w-full max-w-[200px]"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveName();
                  if (e.key === 'Escape') setIsEditingName(false);
                }}
              />
              <button
                type="button"
                data-testid="name-save-button"
                onClick={handleSaveName}
                className="w-8 h-8 flex items-center justify-center bg-neo-lime border-2 border-neo-black rounded-neo shadow-hard-sm shrink-0"
              >
                <Check className="w-4 h-4 text-neo-black" />
              </button>
              <button
                type="button"
                onClick={() => { setIsEditingName(false); setEditNameValue(username); }}
                className="w-8 h-8 flex items-center justify-center bg-white/10 border-2 border-neo-black rounded-neo shrink-0"
              >
                <X className="w-4 h-4 text-neo-cream" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-neo-cream truncate">
                {username}
              </h2>
              {!isAuthenticated && (
                <button
                  type="button"
                  data-testid="edit-name-button"
                  onClick={() => { setEditNameValue(username); setIsEditingName(true); }}
                  className="shrink-0 w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                  aria-label={t('playerView.editName')}
                >
                  <Pencil className="w-3.5 h-3.5 text-slate-400" />
                </button>
              )}
            </div>
          )}

          {/* Ready toggle — lets a non-host signal the host they're set to go.
              Advisory only: the host can still start whenever they like. */}
          {onToggleReady ? (
            <m.button
              type="button"
              data-testid="ready-button"
              onClick={onToggleReady}
              whileTap={{ scale: 0.96 }}
              aria-pressed={isReady}
              className={cn(
                'mt-3 w-full flex items-center justify-center gap-2 py-3 px-4 rounded-neo border-3 font-black uppercase tracking-wide shadow-hard transition-colors',
                isReady
                  // Confirmed: solid lime fill + check — unmistakable "you're ready".
                  ? 'bg-neo-lime text-neo-black border-neo-black'
                  // Resting CTA: lime-outlined on navy — clearly a ready button asking for the tap.
                  : 'bg-neo-navy border-neo-lime text-neo-lime hover:bg-neo-lime/10',
              )}
            >
              {isReady ? <Check className="w-5 h-5 stroke-[3]" /> : <Zap className="w-5 h-5" />}
              <span>{isReady ? t('playerView.readyConfirmed') : t('playerView.readyUp')}</span>
            </m.button>
          ) : null}

          <LobbyAutoStartStatus readyCount={readyCount} readyTotal={readyTotal} t={t} />

          <LobbyRewardCluster surface="player_waiting" className="mt-3" />
        </div>
      </div>
    </m.div>
  );

  // Ambient daily-challenge awareness. Rendered as a SIBLING of the hero card
  // (not inside it) because the hero card is `overflow-hidden` — nesting would
  // clip the tap-popover. Own status only; never navigates out of the room.
  const renderDailyEmber = (): React.ReactElement => (
    <div className="px-1" data-testid="lobby-daily-ember-slot">
      <LobbyDailyEmber />
    </div>
  );

  // ==================== Player Roster ====================
  const renderPlayerRoster = (): React.ReactElement => (
    <section className="space-y-2">
      {/* No roster header — the top bar already shows the live X/8 count; a second
          "players in room" label + count was pure noise. */}
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide pt-1">
        <AnimatePresence>
          {nonHostPlayers.map((player, index) => {
            const name = typeof player === 'string' ? player : player.username;
            const avatar = typeof player === 'object' ? player.avatar : null;
            const isHostPlayer = typeof player === 'object' ? player.isHost : false;
            const isBot = typeof player === 'object' ? player.isBot : false;
            const isMe = name === username;

            return (
              <m.div
                key={name}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{
                  type: 'spring', stiffness: 400, damping: 22, delay: index * 0.06,
                }}
                className="shrink-0 flex flex-col items-center gap-1.5"
              >
                <div
                  className="relative animate-avatar-float"
                  style={{ animationDelay: `${index * 200}ms` }}
                >
                  {isHostPlayer && (
                    <m.div
                      className="absolute -top-3 left-1/2 -translate-x-1/2 z-10"
                      animate={{ rotate: [0, 5, -5, 0] }}
                      transition={{ duration: 2, repeat: Infinity, repeatDelay: 4 }}
                    >
                      <Crown className="w-4 h-4 text-neo-yellow" />
                    </m.div>
                  )}
                  <div className={cn(
                    'w-16 h-16 rounded-full border-3 border-neo-black flex items-center justify-center overflow-hidden shadow-hard aspect-square',
                    isMe ? 'ring-2 ring-neo-lime ring-offset-2 ring-offset-neo-navy' : '',
                  )}>
                    {/* Avatar handles full fallback chain (customAvatar → seeded face from userId).
                        Don't gate on hasAvatar: backend may emit legacy `{emoji,color}` shape
                        (userManager.ts) which has no customAvatar — Avatar still renders a
                        deterministic seeded face from userId={name}. Stacking a colored bg
                        disc + initial-letter span behind it caused a visible "two avatars" bug. */}
                    <Avatar
                      customAvatar={avatar?.customAvatar ?? undefined}
                      userId={name}
                      pixelSize={64}
                      mode="multiplayer"
                      className="w-full h-full"
                      mood={emotesByUsername[name]?.emote}
                    />
                  </div>
                  {/* Lobby emote = avatar FACE-SWAP only (eyes/brows/mouth via the
                      `mood` prop above). No floating emoji bubble — the face is the
                      whole signal, mirrored to every player in the room. */}
                  {isBot && (
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-neo-cyan border-2 border-neo-black rounded-full flex items-center justify-center">
                      <Bot className="w-3 h-3 text-neo-black" />
                    </div>
                  )}
                  {/* Ready badge — non-host humans the server marked ready */}
                  {!isHostPlayer && !isBot && readySet.has(name) && (
                    <div
                      data-testid="roster-ready-badge"
                      className="absolute -bottom-1 -right-1 w-5 h-5 bg-neo-lime border-2 border-neo-black rounded-full flex items-center justify-center shadow-hard-sm"
                      aria-label={t('playerView.readyConfirmed')}
                    >
                      <Check className="w-3 h-3 text-neo-black stroke-[3]" />
                    </div>
                  )}
                </div>
                <span className="text-[11px] font-bold truncate w-16 text-center text-neo-cream">
                  {name}
                </span>
              </m.div>
            );
          })}
        </AnimatePresence>

        {/* Empty Slots */}
        {Array.from({ length: emptySlots }).map((_, i) => (
          <div key={`empty-${i}`} className="shrink-0 flex flex-col items-center gap-1.5">
            <div className="w-16 h-16 rounded-full border-2 border-dashed border-neo-cyan/30 bg-white/5 flex items-center justify-center">
              <Plus className="w-5 h-5 text-neo-cyan/50" />
            </div>
            <span className="text-[10px] font-bold text-slate-600 uppercase">
              {t('common.join')}
            </span>
          </div>
        ))}
      </div>

      {/* Compact emote — one button that expands the emoji row on tap; tapping a
          face reacts on your own avatar (above) for the whole room. No permanent
          labelled row. Lives here (not the overflow-hidden hero card) so the
          expanded row isn't clipped. */}
      <div className="px-1 pt-1">
        <EmoteTray onEmote={sendEmote} t={t} disabled={cooldownActive} compact />
      </div>
    </section>
  );

  // ==================== Interactive Game Instructions ====================
  // Render the SHARED GameInstructions component (same one the host uses) so the
  // host and every player see IDENTICAL how-to-play content for every mode —
  // including wheel-rush + localized step images that the old inline copy lacked.
  const renderModeTips = (): React.ReactElement | null => {
    // Always show How-to-Play to non-host players in the lobby. The host may not
    // have locked in a mode yet (null/'random'), so fall back to classic rather
    // than hiding the panel entirely.
    const mode = (gameMode || 'classic') as GameModeOption;
    return (
      <GameInstructions
        selectedGameMode={mode}
        t={t}
        defaultOpen={false}
        lang={gameLanguage ?? 'en'}
      />
    );
  };

  // ==================== Mobile Content ====================
  // Non-scrolling flex column: the fixed-size sections stack at their natural
  // height and the chat/tutorial panel (flex-1, min-h-0) absorbs all remaining
  // space — so the screen fits without page scroll, and an inline emote expansion
  // just shrinks the chat rather than overflowing. The duplicate share section was
  // dropped (invite already lives compact in the top bar).
  const renderMobileContent = (): React.ReactElement => (
    <div className="flex-1 flex flex-col overflow-hidden px-3 py-2 gap-2 min-h-0">
      <section className="shrink-0">{renderHeroCard()}</section>
      <div className="shrink-0">{renderDailyEmber()}</div>
      <div className="shrink-0">{renderPlayerRoster()}</div>
      <div className="shrink-0">{renderModeTips()}</div>
      <section className="flex-1 min-h-0 pb-1">
        {/* overflow-y-auto (not -hidden): on a short screen the chat panel is the
            flex-fill that gets squeezed — its content (e.g. the guest age-gate)
            then scrolls WITHIN the panel instead of being clipped. The page itself
            never scrolls (the mobile root is bounded). */}
        <div className="h-full bg-neo-navy/30 rounded-neo-lg border-2 border-neo-black/50 overflow-y-auto overscroll-contain">
          {isOnCrazyGamesPlatform ? (
            <LobbyTutorialPanel t={t} />
          ) : (
            <RoomChat
              username={username}
              isHost={false}
              gameCode={gameCode}
              className="h-full"
              onNewMessage={() => {}}
              variant="embedded"
            />
          )}
        </div>
      </section>
    </div>
  );

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-neo-navy lg:max-w-7xl lg:mx-auto">
      {/* Header */}
      <header className="shrink-0 px-3 py-2 bg-neo-navy/95 border-b-3 border-neo-black sticky z-20" style={{ top: 'var(--combined-safe-area-top, env(safe-area-inset-top, 0px))' }}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <MobileShareSection gameCode={gameCode} t={t} compact />
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {gameLanguage && (
              <div className="bg-black/40 border-2 border-neo-black px-2 py-1 rounded-md flex items-center gap-1.5">
                <span className="text-sm">{LANGUAGE_FLAGS[gameLanguage] || '🌐'}</span>
                <span className="text-xs font-black text-neo-cream uppercase">
                  {getLanguageName(gameLanguage, true)}
                </span>
              </div>
            )}
            {/* UI-language pill — distinct from the board-language chip above; one tap. */}
            <QuickLanguageSwitcher compact />
            <div className="bg-black/40 border-2 border-neo-black px-2 py-1 rounded-md flex items-center gap-1.5">
              <Users className="w-4 h-4 text-neo-cyan" />
              <span className="text-xs font-black text-neo-cream">
                {nonHostPlayers.length}/{MAX_PLAYERS}
              </span>
            </div>
            <button
              type="button"
              onClick={onExitRoom}
              className="w-9 h-9 flex items-center justify-center bg-neo-red border-2 border-neo-black shadow-hard-sm active:translate-y-0.5 active:shadow-none transition-all rounded"
              aria-label={t('common.exit')}
            >
              <LogOut className="w-4 h-4 text-neo-black rtl:scale-x-[-1]" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 min-h-0 overflow-hidden flex flex-col bg-neo-navy/95">
        {/* Desktop Layout — triggers at 720px (tablet portrait+) for parity with HostPreGameView */}
        <div className="hidden min-[720px]:block h-full">
          <DesktopLobbyLayout
            leftContent={
              <>
                {renderHeroCard()}
                {renderDailyEmber()}
                {renderPlayerRoster()}
                {renderModeTips()}
              </>
            }
            rightContent={
              <>
                <InviteCard gameCode={gameCode} t={t} desktop />
                <div
                  data-testid="desktop-chat-area"
                  className="flex-1 min-h-0 bg-neo-navy/30 rounded-neo-lg border-3 border-neo-cyan/20 shadow-hard overflow-hidden"
                >
                  {isOnCrazyGamesPlatform ? (
                    <LobbyTutorialPanel t={t} />
                  ) : (
                    <RoomChat
                      username={username}
                      isHost={false}
                      gameCode={gameCode}
                      className="h-full"
                      onNewMessage={() => {}}
                      variant="embedded"
                    />
                  )}
                </div>
              </>
            }
          />
        </div>

        {/* Mobile Layout — below 720px (phones) */}
        <div className="min-[720px]:hidden flex flex-col flex-1 min-h-0">
          {renderMobileContent()}
        </div>
      </main>

      {/* B4 — CrazyGames waiting-room banner */}
      <div className="w-full flex justify-center py-2">
        <CrazyGamesBanner size="320x50" />
      </div>

      {/* Avatar Builder Modal */}
      <AvatarBuilderModal
        isOpen={isAvatarBuilderOpen}
        onClose={() => setIsAvatarBuilderOpen(false)}
        onSave={handleAvatarSave}
        initialConfig={currentAvatar}
        premium={avatarPremium}
      />

      {/* Exit Confirmation Dialog */}
      <AlertDialog open={showExitConfirm} onOpenChange={setShowExitConfirm}>
        <AlertDialogContent className="bg-neo-cream text-neo-black border-4 border-neo-black shadow-hard">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-black">{t('playerView.exitConfirmation')}</AlertDialogTitle>
            <AlertDialogDescription className="text-neo-black/70 font-bold">
              {t('playerView.exitWarning')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-neo-cream text-neo-black border-3 border-neo-black shadow-hard-sm font-bold">
              {t('common.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction onClick={onConfirmExit} className="bg-neo-red text-neo-white border-3 border-neo-black shadow-hard-sm font-bold">
              {t('common.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default memo(PlayerWaitingView);
