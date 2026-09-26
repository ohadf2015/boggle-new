'use client';

/**
 * Host lobby (host is playing). One screen, no page scroll, at phone, desktop
 * and TV sizes:
 *   header  [exit] [room code → copy + invite sheet] … [chat] [sound] [gear]
 *   body    status lane · 8-seat grid · mode picker (+ "How to play")
 *   footer  [INVITE] [START BATTLE · n/8 | vs bots]
 * Desktop (≥720px) keeps the 7/5 grid: seats + mode left; invite, settings
 * summary and a chat launcher right (chat itself only ever opens in a sheet).
 * All timers / bot rescue / start guards live in `useHostLobby`.
 */
import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { BookOpen, Monitor, UserPlus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useCrazyGames } from '@/components/CrazyGamesSDK';
import { EmoteTray } from '@/player/components/lobby/EmoteTray';
import { useLobbyEmotes } from '@/hooks/useLobbyEmotes';
import { MpHudBar } from '@/components/multiplayer/shell/MpHudBar';
import { MpRoomCode } from '@/components/multiplayer/shell/MpRoomCode';
import { StartButton } from './pre-game/StartButton';
import { PlayerRoster } from './pre-game/PlayerRoster';
import { BattleModeCard } from './pre-game/BattleModeCard';
import { AdvancedSettingsModal } from './pre-game/AdvancedSettingsModal';
import { LobbyAudioButton } from './pre-game/LobbyAudioButton';
import { DesktopLobbyLayout, InviteCard } from './pre-game/desktop';
import TvTutorialOverlay from './tv-broadcast/TvTutorialOverlay';
import { useHostLobby, LOBBY_MAX_PLAYERS, type HostLobbyPlayer } from '@/components/multiplayer/lobby/useHostLobby';
import { HostStatusLane } from '@/components/multiplayer/lobby/HostStatusLane';
import { useChatUnread } from '@/components/multiplayer/lobby/useChatUnread';
import { lobbySeats, startSublabel } from '@/components/multiplayer/lobby/lobbySeats';
import {
  LobbyExitButton, LobbyChatButton, LobbyChatLauncher, LobbyCountPill, LobbyChatPanel, InviteSheet, HowToPlaySheet, ChatSheet,
} from '@/components/multiplayer/lobby/LobbyChrome';
import { LobbySettingsSummary } from '@/components/multiplayer/lobby/LobbySettingsSummary';
import { useAvatarPremium } from '@/hooks/useAvatarPremium';
import { getOrCreateStoredCustomAvatar, setStoredCustomAvatar } from '@/utils/profileStorage';
import { cn } from '@/lib/utils';
import type { CustomAvatarConfig } from '@/shared/types/customAvatar';
import type { Language, LetterGrid, DifficultyLevel } from '@/shared/types/game';
import type { GameModeOption } from '@/components/GameModeSelector';

const AvatarBuilderModal = dynamic(() => import('@/components/avatar/AvatarBuilderModal'), { ssr: false });

export { QUICKPLAY_AUTO_FILL_SECONDS } from '@/components/multiplayer/lobby/useHostLobby';

interface TournamentData {
  currentRound?: number;
  totalRounds?: number;
  standings?: unknown[];
  isComplete?: boolean;
}

interface LessonData {
  lessonId: string;
  lessonName: string;
  vocabularyWords: string[];
  language: Language;
  /** Game mode the teacher chose; seeds the host's mode selector. */
  gameMode?: GameModeOption;
  templateSettings?: { timerSeconds: number; difficulty: string; minWordLength: number; allowLateJoin: boolean } | null;
}

interface HostPreGameViewProps {
  gameCode: string;
  roomLanguage: Language;
  language: Language;
  username: string;
  t: (path: string, fallbackOrParams?: string | Record<string, string | number>, params?: Record<string, string | number>) => string;
  timerValue: number;
  setTimerValue: React.Dispatch<React.SetStateAction<number>>;
  timerDirection: number;
  setTimerDirection: React.Dispatch<React.SetStateAction<number>>;
  difficulty: DifficultyLevel;
  setDifficulty: React.Dispatch<React.SetStateAction<DifficultyLevel>>;
  minWordLength: number;
  setMinWordLength: React.Dispatch<React.SetStateAction<number>>;
  gameType: 'regular' | 'tournament';
  setGameType: React.Dispatch<React.SetStateAction<'regular' | 'tournament'>>;
  tournamentRounds: number;
  setTournamentRounds: React.Dispatch<React.SetStateAction<number>>;
  tournamentData: TournamentData | null;
  hostPlaying: boolean;
  setHostPlaying: React.Dispatch<React.SetStateAction<boolean>>;
  playersReady: (string | HostLobbyPlayer)[];
  /** Usernames the server reports as lobby-ready (non-host). */
  readyUsernames?: string[];
  /** Total non-host humans the server is tracking for readiness. */
  readyTotal?: number;
  /** Server-owned lobby auto-start countdown (seconds), or null when idle. */
  autoStartSecondsLeft?: number | null;
  onCancelAutoStart?: () => void;
  playerWordCounts: Record<string, number>;
  shufflingGrid: LetterGrid | null;
  highlightedCells: { row: number; col: number }[];
  tableData: LetterGrid;
  onStartGame: () => void;
  /** Start straight away with bots (rescue paths + the explicit vs-bots tap). */
  onAutoStartWithBots?: () => void;
  onExitRoom: () => void;
  onCancelTournament: () => void;
  onRegenerateBoard?: () => void;
  tournamentCreating: boolean;
  lessonData?: LessonData | null;
  onNameChange?: (newName: string) => void;
  onAvatarChange?: (config: CustomAvatarConfig) => void;
  /** Quick Play / classroom: no invite or share affordances. */
  isPrivate?: boolean;
  /** Quick Play: auto-fill bots + start. */
  isQuickPlay?: boolean;
}

type T = (path: string, params?: Record<string, string | number>) => string;

const CARD = 'rounded-neo-lg border-3 border-neo-black bg-neo-navy-light/70 shadow-hard p-3 desktop-tall:p-4';

function HostPreGameView(props: HostPreGameViewProps): React.ReactElement {
  const {
    gameCode, roomLanguage, username, timerValue, setTimerValue, difficulty, setDifficulty, minWordLength, setMinWordLength,
    hostPlaying, setHostPlaying, playersReady, readyUsernames = [], readyTotal = 0, autoStartSecondsLeft = null, onCancelAutoStart,
    onExitRoom, tournamentCreating, lessonData, onNameChange, onAvatarChange, isPrivate = false, isQuickPlay = false,
  } = props;
  const t = props.t as T;
  const lobby = useHostLobby({
    gameCode, username, hostPlaying, playersReady, timerValue, setTimerValue, setDifficulty, setMinWordLength,
    tournamentCreating, lessonData, isPrivate, isQuickPlay, onStartGame: props.onStartGame, onAutoStartWithBots: props.onAutoStartWithBots,
  });
  const { isAuthenticated, updateProfile } = useAuth();
  const { isOnCrazyGamesPlatform } = useCrazyGames();
  const { sendEmote, cooldownActive } = useLobbyEmotes({ socket: lobby.socket });

  const [sheet, setSheet] = useState<'invite' | 'howto' | 'chat' | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const closeSheet = () => setSheet(null);
  const unread = useChatUnread({ socket: lobby.socket, username, open: sheet === 'chat' });

  const [isAvatarBuilderOpen, setIsAvatarBuilderOpen] = useState(false);
  const avatarPremium = useAvatarPremium();
  const [currentAvatar, setCurrentAvatar] = useState<CustomAvatarConfig>(() => getOrCreateStoredCustomAvatar());
  const handleAvatarSave = async (config: CustomAvatarConfig) => {
    setStoredCustomAvatar(config);
    setCurrentAvatar(config);
    onAvatarChange?.(config);
    setIsAvatarBuilderOpen(false);
    await updateProfile({ avatar_config: config }).catch(() => {});
  };
  const handleSelfNameChange = (newName: string) => {
    const trimmed = newName.trim();
    if (trimmed && trimmed !== username) onNameChange?.(trimmed);
  };
  const openAvatarBuilder = () => setIsAvatarBuilderOpen(true);

  // A classroom room's mode was fixed in the setup wizard: no picker here.
  const isClassroomRoom = Boolean(lessonData);
  const seats = lobbySeats(lobby.seatedPlayers, username, readyUsernames);
  // "Everyone's in" is the server's call (playersReadyUpdate totals), not a
  // client recount — one source of truth (pitfall class 3).
  const allReady = readyTotal > 0 && readyUsernames.length >= readyTotal;
  const sublabel = startSublabel({ seated: seats.length, humanGuests: lobby.humanGuestCount, t });

  // TV/projector toggle. useHostViewState pins phone/tablet (<1024px, read at
  // mount) to player mode, so the toggle only exists where it can take effect.
  const tvModeToggle = (
    <button
      type="button"
      onClick={() => setHostPlaying((prev) => !prev)}
      aria-label={`${t('hostView.broadcastModeTitle')} — ${t('hostView.broadcastModeDesc')}`}
      className={cn(
        'hidden lg:inline-flex items-center gap-1.5 h-9 px-2.5 rounded-neo border-2 border-neo-black text-[11px] font-bold uppercase tracking-wider shadow-hard-sm active:translate-y-0.5',
        !hostPlaying ? 'bg-neo-cyan text-neo-black' : 'bg-neo-navy text-neo-white/70 hover:text-neo-white',
      )}
    >
      <Monitor aria-hidden="true" className="w-4 h-4" />
      <span>{t('hostView.broadcastModeTitle')}</span>
    </button>
  );

  const emote = <EmoteTray onEmote={sendEmote} t={t} disabled={cooldownActive} compact />;

  const statusLane = (
    <HostStatusLane
      t={t}
      autoStartSecondsLeft={autoStartSecondsLeft}
      onCancelAutoStart={onCancelAutoStart}
      botCountdown={lobby.botCountdown}
      onCancelBotCountdown={lobby.cancelBotCountdown}
      showSoloPrompt={lobby.showSoloPrompt}
      onPlayVsBots={lobby.handleSoloPlayVsBots}
      adHold={lobby.anyAdActive}
    />
  );

  const roster = (headerExtra?: React.ReactNode) => (
    <div className={CARD}>
      <PlayerRoster
        players={lobby.seatedPlayers}
        username={username}
        gameCode={gameCode}
        maxPlayers={LOBBY_MAX_PLAYERS}
        readyUsernames={readyUsernames}
        t={t}
        onSelfAvatarClick={openAvatarBuilder}
        onSelfNameChange={handleSelfNameChange}
        canEditSelfName={!isAuthenticated}
        selfActions={emote}
        headerExtra={headerExtra}
      />
    </div>
  );

  const modePicker = !isClassroomRoom && (
    <div className={cn(CARD, 'flex-1 min-h-0 flex flex-col')}>
      <BattleModeCard
        fill
        selectedGameMode={lobby.selectedGameMode}
        setSelectedGameMode={lobby.setSelectedGameMode}
        t={t}
        isAdmin={lobby.isAdmin}
        language={roomLanguage}
        onHowToPlay={() => setSheet('howto')}
      />
    </div>
  );

  const settingsSummary = (
    <LobbySettingsSummary timerValue={timerValue} difficulty={difficulty} minWordLength={minWordLength} t={t} onPress={() => setSettingsOpen(true)} />
  );

  const startButton = (
    <StartButton
      onStartGame={lobby.handleStartClick}
      disabled={lobby.isStartDisabled}
      tournamentCreating={tournamentCreating}
      playerCount={seats.length}
      maxPlayers={LOBBY_MAX_PLAYERS}
      t={t}
      labelKey={isClassroomRoom ? 'hostView.startClassGame' : undefined}
      sublabel={sublabel}
      celebrate={allReady}
    />
  );

  return (
    <div className="flex-1 flex flex-col min-h-0 w-full bg-neo-navy text-neo-white relative lg:max-w-[calc(1280px*var(--mp-u,1))] lg:mx-auto">
      {lessonData && (
        <div className="shrink-0 flex items-center gap-2 px-3 py-1.5 bg-neo-purple/20 border-b-2 border-neo-purple/50 text-sm min-w-0">
          <BookOpen aria-hidden="true" className="w-4 h-4 text-neo-purple shrink-0" />
          <span className="font-bold text-neo-purple shrink-0">{t('hostView.lessonMode')}:</span>
          <span className="truncate" dir="auto">{lessonData.lessonName}</span>
          <span className="text-xs text-neo-white/60 shrink-0">({lessonData.vocabularyWords.length} {t('hostView.words')})</span>
        </div>
      )}

      <header className="shrink-0 border-b-3 border-neo-black bg-neo-navy">
        <MpHudBar
          className="grid-cols-[auto_1fr_auto]"
          start={<LobbyExitButton onPress={onExitRoom} t={t} />}
          center={
            isPrivate
              ? <LobbyCountPill count={seats.length} max={LOBBY_MAX_PLAYERS} />
              : <MpRoomCode code={gameCode} size="chip" onCopy={() => setSheet('invite')} className="px-2 text-[24px] tracking-[0.1em] [&>svg]:hidden min-[720px]:text-[length:calc(28px*var(--mp-u,1))] min-[720px]:tracking-[0.2em] min-[720px]:[&>svg]:inline" />
          }
          end={
            <>
              <LobbyChatButton onPress={() => setSheet('chat')} unread={unread} t={t} className="min-[720px]:hidden" />
              <LobbyAudioButton />
              <AdvancedSettingsModal
                timerValue={timerValue}
                setTimerValue={setTimerValue}
                difficulty={difficulty}
                setDifficulty={setDifficulty}
                minWordLength={minWordLength}
                setMinWordLength={setMinWordLength}
                roomLanguage={roomLanguage}
                onRoomLanguageChange={lobby.handleRoomLanguageChange}
                t={t}
                open={settingsOpen}
                onOpenChange={setSettingsOpen}
              />
            </>
          }
        />
      </header>

      <main className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <h1 className="sr-only">{t('hostView.lobbyTitle')}</h1>

        {/* Desktop / tablet (≥720px): seats + mode left, invite + chat right. */}
        <div className="hidden min-[720px]:flex min-[720px]:flex-col flex-1 min-h-0">
          <DesktopLobbyLayout
            leftContent={
              <>
                {roster(tvModeToggle)}
                {modePicker}
              </>
            }
            rightContent={
              <div data-testid="desktop-chat-area" className="flex-1 min-h-0 flex flex-col gap-4">
                {/* Status sits over the invite; chat is a launcher row, not a
                    panel, so the rail never spends itself on an idle chat. */}
                {statusLane}
                {!isPrivate && <InviteCard gameCode={gameCode} t={props.t} showHint={lobby.humanGuestCount === 0} className="flex-1 min-h-0 justify-center" />}
                {settingsSummary}
                <LobbyChatLauncher onPress={() => setSheet('chat')} unread={unread} t={t} className={isPrivate ? 'mt-auto' : undefined} />
              </div>
            }
          />
          <div className="shrink-0 px-6 py-3 border-t-3 border-neo-black bg-neo-navy">
            <div className="mx-auto w-full max-w-[480px] tv:max-w-[720px]">{startButton}</div>
          </div>
        </div>

        {/* Phone (<720px): one fixed column, footer CTA pinned. */}
        <div data-testid="lobby-phone" className="min-[720px]:hidden flex flex-col flex-1 min-h-0">
          <div className="flex-1 min-h-0 flex flex-col gap-3 px-3 py-3 w-full max-w-[600px] mx-auto">
            {statusLane}
            {roster()}
            {modePicker}
            {settingsSummary}
          </div>
          <div className="shrink-0 px-3 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] border-t-3 border-neo-black bg-neo-navy">
            <div className="max-w-[600px] mx-auto flex items-stretch gap-2">
              {!isPrivate && (
                <button
                  type="button"
                  onClick={() => setSheet('invite')}
                  data-testid="lobby-invite-button"
                  // Outlined secondary: START BATTLE! beside it is the lobby's one solid CTA.
                  className="shrink-0 w-20 flex flex-col items-center justify-center gap-0.5 rounded-neo border-3 border-neo-cyan bg-neo-navy text-neo-cyan font-neo-display text-xs font-bold uppercase shadow-hard-sm hover:bg-neo-cyan/10 active:translate-y-0.5 active:shadow-none"
                >
                  <UserPlus aria-hidden="true" className="w-6 h-6" />
                  {t('mpUi.lobby.invite')}
                </button>
              )}
              <div className="flex-1 min-w-0">{startButton}</div>
            </div>
          </div>
        </div>
      </main>

      {!isPrivate && <InviteSheet open={sheet === 'invite'} onClose={closeSheet} gameCode={gameCode} t={t} />}
      <HowToPlaySheet open={sheet === 'howto'} onClose={closeSheet} mode={lobby.selectedGameMode} lang={roomLanguage} t={t} />
      <ChatSheet open={sheet === 'chat'} onClose={closeSheet} t={t}>
        <LobbyChatPanel username={username} isHost gameCode={gameCode} t={t} crazyGames={isOnCrazyGamesPlatform} />
      </ChatSheet>

      <TvTutorialOverlay onComplete={lobby.closeTvTutorial} onSkip={lobby.closeTvTutorial} t={t} forceShow={lobby.showTvTutorial} />
      <AvatarBuilderModal
        isOpen={isAvatarBuilderOpen}
        onClose={() => setIsAvatarBuilderOpen(false)}
        onSave={handleAvatarSave}
        initialConfig={currentAvatar}
        premium={avatarPremium}
      />
    </div>
  );
}

export default HostPreGameView;
