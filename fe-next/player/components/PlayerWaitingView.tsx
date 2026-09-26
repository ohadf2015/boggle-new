'use client';

/**
 * Joiner lobby. One screen, no page scroll:
 *   header  [exit] [board language] … [invite] [chat] [sound]
 *   body    8-seat grid (same `lobbySeats` source as the host) · DJ Lexi + status
 *   footer  READY toggle
 * Desktop (≥720px): seats + status + how-to-play left, invite + chat right.
 * A classroom student gets ClassroomWaitingStage instead (unchanged contract).
 */
import React, { memo, useState, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { Check, HelpCircle, Pencil, X } from 'lucide-react';
import Avatar from '../../components/Avatar';
import AvatarBuilderModal from '../../components/avatar/AvatarBuilderModal';
import { useAvatarPremium } from '@/hooks/useAvatarPremium';
import { LobbyAudioButton } from '../../host/components/pre-game/LobbyAudioButton';
import { LobbyAutoStartStatus } from '@/components/lobby/LobbyAutoStartStatus';
import { EmoteTray } from './lobby/EmoteTray';
import { useSocketOptional } from '@/utils/SocketContext';
import { useLobbyEmotes } from '@/hooks/useLobbyEmotes';
import { useLobbyAdGate } from '@/hooks/useLobbyAdGate';
import { useCrazyGames } from '@/components/CrazyGamesSDK';
import { MobileShareSection } from '../../host/components/pre-game/MobileShareSection';
import { PlayerRoster } from '../../host/components/pre-game/PlayerRoster';
import { DesktopLobbyLayout, InviteCard } from '../../host/components/pre-game/desktop';
import { GameInstructions } from '../../host/components/pre-game/GameInstructions';
import type { GameModeOption } from '@/components/GameModeSelector';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../../components/ui/alert-dialog';
import { cn } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';
import { getOrCreateStoredCustomAvatar, setStoredCustomAvatar } from '@/utils/profileStorage';
import { type CustomAvatarConfig } from '@/shared/types/customAvatar';
import { useGameMode } from '@/hooks/gameState';
import { languageFlag, languageLabelKey } from '@/lib/i18n/languageLabels';
import { DJMascot } from '@/components/ui/DJMascot';
import { MpHudBar } from '@/components/multiplayer/shell/MpHudBar';
import { lobbySeats, readyTally, LOBBY_SEATS } from '@/components/multiplayer/lobby/lobbySeats';
import { ReadyButton } from '@/components/multiplayer/lobby/ReadyButton';
import { useChatUnread } from '@/components/multiplayer/lobby/useChatUnread';
import { LobbyExitButton, LobbyChatButton, LobbyChatPanel, HowToPlaySheet, ChatSheet } from '@/components/multiplayer/lobby/LobbyChrome';
import type { Language, Avatar as AvatarType, PresenceStatus } from '@/shared/types/game';
import { VOCAB_QUIZ_MODE, type ClassroomGameMode } from '@/shared/types/vocabQuiz';
import { ClassroomWaitingStage } from '@/components/education/lobby/ClassroomWaitingStage';

const CrazyGamesBanner = dynamic(() => import('@/components/CrazyGamesBanner'), { ssr: false });

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
  t: (path: string, fallbackOrParams?: string | Record<string, string | number>, params?: Record<string, string | number>) => string;
  playersReady: (string | PlayerReadyInfo)[];
  showQR: boolean;
  setShowQR: (show: boolean) => void;
  showExitConfirm: boolean;
  setShowExitConfirm: (show: boolean) => void;
  onExitRoom: () => void;
  onConfirmExit: () => void;
  onNameChange?: (newName: string) => void;
  onAvatarChange?: (config: CustomAvatarConfig) => void;
  /** Usernames the server reports as ready (non-host). Drives seat badges. */
  readyUsernames?: string[];
  isReady?: boolean;
  /** Toggle local ready state (emits `lobbyReady`). Absent on spectators. */
  onToggleReady?: () => void;
  readyInFlight?: boolean;
  /** A teacher's class: no share code, invite, chat or ad slot. */
  isClassroomMode?: boolean;
  /** The mode the teacher picked, from the room's own record. */
  classroomGameMode?: ClassroomGameMode;
}

type T = (path: string, params?: Record<string, string | number>) => string;

const CARD = 'rounded-neo-lg border-3 border-neo-black bg-neo-navy-light/70 shadow-hard p-3 desktop-tall:p-4';

const PlayerWaitingView: React.FC<PlayerWaitingViewProps> = (props): React.ReactElement => {
  const {
    gameCode, gameLanguage, username, playersReady, showExitConfirm, setShowExitConfirm, onExitRoom, onConfirmExit,
    onNameChange, onAvatarChange, readyUsernames = [], isReady = false, onToggleReady, readyInFlight = false,
    isClassroomMode = false, classroomGameMode,
  } = props;
  const t = props.t as T;
  const { isAuthenticated, updateProfile } = useAuth();
  const { isOnCrazyGamesPlatform } = useCrazyGames();
  const gameMode = useGameMode();

  // Emotes + ad gate ride the shared socket (no prop threading).
  const socket = useSocketOptional()?.socket ?? null;
  const { emotesByUsername, sendEmote, cooldownActive } = useLobbyEmotes({ socket });
  useLobbyAdGate({ socket });

  const [sheet, setSheet] = useState<'howto' | 'chat' | null>(null);
  const closeSheet = useCallback(() => setSheet(null), []);
  const unread = useChatUnread({ socket, username, open: sheet === 'chat' });

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
  const openAvatarBuilder = useCallback(() => setIsAvatarBuilderOpen(true), []);
  const handleSelfNameChange = useCallback((name: string) => {
    const trimmed = name.trim();
    if (trimmed && trimmed !== username) onNameChange?.(trimmed);
  }, [username, onNameChange]);

  // Same seat source as the host → the joiner's count can never read 0.
  const seats = useMemo(() => lobbySeats(playersReady, username, readyUsernames), [playersReady, username, readyUsernames]);
  const { ready: readyCount, total: readyTotal } = readyTally(seats);

  // How-to-play follows the room: a classroom's teacher-chosen mode (a quiz
  // has no board to teach), otherwise the store's mode with classic fallback.
  const howToMode: GameModeOption | null = isClassroomMode
    ? (classroomGameMode && classroomGameMode !== VOCAB_QUIZ_MODE ? (classroomGameMode as GameModeOption) : null)
    : ((gameMode || 'classic') as GameModeOption);
  const lang = gameLanguage ?? 'en';

  const readyButton = onToggleReady ? (
    <ReadyButton isReady={isReady} onToggle={onToggleReady} inFlight={readyInFlight} t={t} />
  ) : null;
  const status = <LobbyAutoStartStatus readyCount={readyCount} readyTotal={readyTotal} t={t} />;
  const emote = <EmoteTray onEmote={sendEmote} t={t} disabled={cooldownActive} compact />;

  const dialogs = (
    <>
      <AvatarBuilderModal
        isOpen={isAvatarBuilderOpen}
        onClose={() => setIsAvatarBuilderOpen(false)}
        onSave={handleAvatarSave}
        initialConfig={currentAvatar}
        premium={avatarPremium}
      />
      <AlertDialog open={showExitConfirm} onOpenChange={setShowExitConfirm}>
        <AlertDialogContent className="bg-neo-cream text-neo-black border-4 border-neo-black shadow-hard">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-black">{t('playerView.exitConfirmation')}</AlertDialogTitle>
            <AlertDialogDescription className="text-neo-black/70 font-bold">{t('playerView.exitWarning')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-neo-cream text-neo-black border-3 border-neo-black shadow-hard-sm font-bold">{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={onConfirmExit} className="bg-neo-red text-neo-white border-3 border-neo-black shadow-hard-sm font-bold">{t('common.confirm')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );

  if (isClassroomMode) {
    return (
      <>
        <ClassroomWaitingStage
          username={username}
          avatar={<Avatar customAvatar={currentAvatar} size="2xl" className="!w-full !h-full" mood={emotesByUsername[username]?.emote} />}
          onEditAvatar={openAvatarBuilder}
          nameSlot={<ClassroomNameEditor username={username} canEdit={!isAuthenticated} onSave={handleSelfNameChange} t={t} />}
          readySlot={readyButton}
          statusSlot={status}
          emoteSlot={emote}
          instructionsSlot={howToMode ? <GameInstructions selectedGameMode={howToMode} t={t} defaultOpen={false} lang={lang} /> : null}
          classmates={playersReady
            .map((p) => (typeof p === 'string' ? { username: p } : p))
            .filter((p) => !('isHost' in p && p.isHost))}
          onExit={onExitRoom}
          t={t}
        />
        {dialogs}
      </>
    );
  }

  const roster = (
    <div className={CARD}>
      <PlayerRoster
        players={playersReady}
        username={username}
        gameCode={gameCode}
        maxPlayers={LOBBY_SEATS}
        readyUsernames={readyUsernames}
        t={t}
        variant="guest"
        onSelfAvatarClick={openAvatarBuilder}
        onSelfNameChange={handleSelfNameChange}
        canEditSelfName={!isAuthenticated}
        selfActions={emote}
      />
    </div>
  );

  const waiting = (
    <div data-testid="waiting-status" className={cn(CARD, 'flex items-center gap-3')}>
      <DJMascot size="xs" className="!w-16 !h-16 tall:!w-24 tall:!h-24 shrink-0" alt="" />
      {/* The shared status line truncates to one line; here it has room to wrap. */}
      <div className="min-w-0 flex-1 flex flex-col gap-2 [&_p]:whitespace-normal [&_p]:line-clamp-3 [&_p]:text-neo-white/85 [&_p]:font-bold">
        {status}
        {howToMode && (
          <button
            type="button"
            onClick={() => setSheet('howto')}
            className="self-start inline-flex items-center gap-1.5 rounded-full border-2 border-neo-black bg-neo-navy px-3 py-1 text-xs font-bold text-neo-cyan shadow-hard-sm active:translate-y-0.5"
          >
            <HelpCircle aria-hidden="true" className="w-3.5 h-3.5" />
            {t('mpUi.lobby.howToPlay')}
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex-1 flex flex-col min-h-0 w-full bg-neo-navy text-neo-white relative lg:max-w-[calc(1280px*var(--mp-u,1))] lg:mx-auto">
      <header className="shrink-0 border-b-3 border-neo-black bg-neo-navy">
        <MpHudBar
          className="grid-cols-[auto_1fr_auto]"
          start={<LobbyExitButton onPress={onExitRoom} t={t} />}
          center={
            gameLanguage ? (
              <span className="inline-flex items-center gap-1.5 h-10 px-3 rounded-neo border-2 border-neo-black bg-neo-navy-light shadow-hard-sm min-w-0">
                <span aria-hidden="true" className="text-base leading-none">{languageFlag(gameLanguage)}</span>
                <span className="truncate text-xs font-bold uppercase tracking-wider text-neo-lime">{t(languageLabelKey(gameLanguage))}</span>
              </span>
            ) : null
          }
          end={
            <>
              <MobileShareSection gameCode={gameCode} t={props.t} compact />
              <LobbyChatButton onPress={() => setSheet('chat')} unread={unread} t={t} className="min-[720px]:hidden" />
              <LobbyAudioButton />
            </>
          }
        />
      </header>

      <main className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <div className="hidden min-[720px]:flex min-[720px]:flex-col flex-1 min-h-0">
          <DesktopLobbyLayout
            leftContent={
              <>
                {roster}
                {waiting}
                {howToMode && (
                  <div className={CARD}>
                    <GameInstructions selectedGameMode={howToMode} t={t} lang={lang} defaultOpen={false} />
                  </div>
                )}
              </>
            }
            rightContent={
              <>
                <InviteCard gameCode={gameCode} t={props.t} />
                <section data-testid="desktop-chat-area" className={cn(CARD, 'flex-1 min-h-48 flex flex-col p-0 overflow-hidden')}>
                  <h2 className="shrink-0 px-4 py-2 border-b-2 border-neo-black font-neo-display text-sm font-bold uppercase tracking-wider text-neo-white/80">
                    {t('mpUi.lobby.chat')}
                  </h2>
                  <div className="flex-1 min-h-0 flex flex-col">
                    <LobbyChatPanel username={username} isHost={false} gameCode={gameCode} t={t} crazyGames={isOnCrazyGamesPlatform} />
                  </div>
                </section>
              </>
            }
          />
          {readyButton && (
            <div className="shrink-0 px-6 py-3 border-t-3 border-neo-black bg-neo-navy">
              <div className="mx-auto w-full max-w-[480px] tv:max-w-[720px]">{readyButton}</div>
            </div>
          )}
        </div>

        <div data-testid="lobby-phone" className="min-[720px]:hidden flex flex-col flex-1 min-h-0">
          <div className="flex-1 min-h-0 flex flex-col justify-center gap-3 px-3 py-2 w-full max-w-[600px] mx-auto">
            {roster}
            {waiting}
          </div>
          {readyButton && (
            <div className="shrink-0 px-3 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] border-t-3 border-neo-black bg-neo-navy">
              <div className="max-w-[600px] mx-auto">{readyButton}</div>
            </div>
          )}
        </div>
      </main>

      {isOnCrazyGamesPlatform && (
        <div data-testid="lobby-ad-slot" className="w-full shrink-0 flex justify-center py-1">
          <CrazyGamesBanner size="320x50" />
        </div>
      )}

      {howToMode && <HowToPlaySheet open={sheet === 'howto'} onClose={closeSheet} mode={howToMode} lang={lang} t={t} />}
      <ChatSheet open={sheet === 'chat'} onClose={closeSheet} t={t}>
        <LobbyChatPanel username={username} isHost={false} gameCode={gameCode} t={t} crazyGames={isOnCrazyGamesPlatform} />
      </ChatSheet>
      {dialogs}
    </div>
  );
};

/** The classroom stage's name line (guest rename). The public lobby renames on the seat. */
function ClassroomNameEditor({ username, canEdit, onSave, t }: { username: string; canEdit: boolean; onSave: (name: string) => void; t: T }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(username);
  const save = () => {
    onSave(value);
    setEditing(false);
  };
  if (editing) {
    return (
      <div className="flex items-center gap-2">
        <input
          data-testid="name-edit-input"
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          maxLength={20}
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter') save();
            if (e.key === 'Escape') setEditing(false);
          }}
          className="bg-white/10 text-neo-cream border-2 border-neo-black rounded-neo px-3 py-1.5 text-lg font-black focus:outline-hidden focus:ring-2 focus:ring-neo-cyan w-full max-w-[200px]"
        />
        <button type="button" data-testid="name-save-button" onClick={save} aria-label={t('common.save')} className="w-8 h-8 flex items-center justify-center bg-neo-lime border-2 border-neo-black rounded-neo shadow-hard-sm shrink-0">
          <Check className="w-4 h-4 text-neo-black" />
        </button>
        <button type="button" onClick={() => { setEditing(false); setValue(username); }} aria-label={t('common.cancel')} className="w-8 h-8 flex items-center justify-center bg-white/10 border-2 border-neo-black rounded-neo shrink-0">
          <X className="w-4 h-4 text-neo-cream" />
        </button>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2">
      <h2 className="text-xl font-black text-neo-cream truncate">{username}</h2>
      {canEdit && (
        <button
          type="button"
          data-testid="edit-name-button"
          onClick={() => { setValue(username); setEditing(true); }}
          className="shrink-0 w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 border-[2px] border-neo-cream text-neo-cream flex items-center justify-center transition-colors"
          aria-label={t('playerView.editName')}
        >
          <Pencil className="w-3.5 h-3.5 text-neo-cream" />
        </button>
      )}
    </div>
  );
}

export default memo(PlayerWaitingView);
