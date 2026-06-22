'use client';

import { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { m } from 'framer-motion';
import { Play, Crown, Check, X, Trophy } from 'lucide-react';
import Avatar from '@/components/Avatar';
import { useLanguage } from '@/contexts/LanguageContext';
import { MODE_ICONS, MODE_ACTIVE_COLORS, getModeLabel, getModeDescription, type GameModeOption } from '@/components/GameModeSelector';
import { useCrazyGames } from '@/components/CrazyGamesSDK';
import { cn } from '@/lib/utils';
import type { Avatar as AvatarType } from '@/types';

interface PlayerInfo {
  username: string;
  avatar?: AvatarType;
  isBot?: boolean;
  isHost?: boolean;
}

interface StickyReadyBarProps {
  isHost: boolean;
  isCurrentPlayerReady: boolean;
  currentPlayerRank: number;
  winnerUsername?: string;
  readyCount: number;
  totalPlayers: number;
  readyUsernames?: string[];
  players?: PlayerInfo[];
  onStartGame: () => void;
  onMarkReady: () => void;
  selectedGameMode?: GameModeOption;
  onSelectGameMode?: (mode: GameModeOption) => void;
  /** Whether the series (best-of-3) is complete */
  isSeriesComplete?: boolean;
  /** Series winner username */
  seriesWinnerUsername?: string;
  /** Callback to reset the series and start fresh */
  onNewSeries?: () => void;
  /** Classroom mode — teacher controls game flow, no auto-countdown */
  isClassroom?: boolean;
  /**
   * Desktop results page variant — renders the host mode switcher with a
   * heading and larger, higher-contrast pills so the active mode (and any
   * change to it) is unmistakable on the wide desktop bar.
   */
  desktopProminent?: boolean;
}

const ALL_MODES: GameModeOption[] = ['word-hunt', 'classic', 'wheel-rush', 'blast', 'random'];
const AUTO_SECONDS_DEFAULT = 35;
// CG sessions are short and impulsive — trim result pause so more matches
// fit per session, lifting CG's average-playtime metric. 20s leaves room
// to read final scores without giving the user a bounce window.
const AUTO_SECONDS_CG = 20;
// Minimum time host must wait before starting next round, so other
// players can read the results screen. Bypassed when everyone is ready.
const HOST_HOLD_SECONDS = 15;

/**
 * Inline ready bar — renders as flex items inside a parent floating bar.
 * No fixed positioning or background — the parent ResultsPage handles that.
 *
 * All players (host + non-host) get a 35s auto-countdown.
 * - Host: auto-starts game after 35s
 * - Non-host: auto-marks ready after 35s
 * - Cancellation persists across game rounds (sessionStorage)
 * - Non-1st-place players see "Revenge {winner}"
 * - 1st-place sees "Defend Title"
 * - Bots are always counted as ready
 */
export default function StickyReadyBar({
  isHost,
  isCurrentPlayerReady,
  currentPlayerRank,
  winnerUsername,
  readyCount: rawReadyCount,
  totalPlayers: _rawTotalPlayers,
  readyUsernames = [],
  players = [],
  onStartGame,
  onMarkReady,
  selectedGameMode,
  onSelectGameMode,
  isSeriesComplete,
  seriesWinnerUsername,
  onNewSeries,
  isClassroom = false,
  desktopProminent = false,
}: StickyReadyBarProps) {
  const { t } = useLanguage();
  const { isOnCrazyGamesPlatform } = useCrazyGames();
  const AUTO_SECONDS = isOnCrazyGamesPlatform ? AUTO_SECONDS_CG : AUTO_SECONDS_DEFAULT;

  const isRevenge = currentPlayerRank > 1 && !!winnerUsername;

  // Exclude host from ready tracking — host clicks "Start Game", not "Ready"
  const nonHostPlayers = useMemo(() => players.filter(p => !p.isHost), [players]);
  // Count bots as always-ready for display purposes
  const botCount = useMemo(() => nonHostPlayers.filter(p => p.isBot).length, [nonHostPlayers]);
  const readyCount = rawReadyCount + botCount;
  const totalPlayers = nonHostPlayers.length > 0 ? nonHostPlayers.length : _rawTotalPlayers;

  const readySet = useMemo(() => new Set(readyUsernames), [readyUsernames]);

  const playerMap = useMemo(() => {
    const map = new Map<string, PlayerInfo>();
    for (const p of players) map.set(p.username, p);
    return map;
  }, [players]);

  const winnerAvatar = winnerUsername ? playerMap.get(winnerUsername)?.avatar : undefined;

  // ---------- Unified auto-countdown for ALL players ----------
  // Persist cancellation across game rounds via sessionStorage. On CrazyGames
  // we DON'T persist — locking a CG player into manual ready ends sessions
  // early, which directly tanks playtime and conversion metrics.
  const [cancelled, setCancelled] = useState(() => {
    if (isOnCrazyGamesPlatform) return false;
    try { return sessionStorage.getItem('mp-auto-advance-cancelled') === '1'; }
    catch { return false; }
  });
  const [secondsLeft, setSecondsLeft] = useState(AUTO_SECONDS);
  const [tooltipMode, setTooltipMode] = useState<GameModeOption | null>(null);
  const [hostHoldExpired, setHostHoldExpired] = useState(false);
  const hostHoldExpiredRef = useRef(false);
  const completedRef = useRef(false);
  const countdownStartedRef = useRef(false);

  const allReady = totalPlayers > 0 && readyCount >= totalPlayers;
  const hostStartGated = isHost && !hostHoldExpired && !allReady;

  useEffect(() => {
    if (!isHost) return;
    const tid = setTimeout(() => {
      hostHoldExpiredRef.current = true;
      setHostHoldExpired(true);
    }, HOST_HOLD_SECONDS * 1000);
    return () => clearTimeout(tid);
  }, [isHost]);

  // Determine if we should show auto-countdown
  // Host: always (auto-starts game)
  // Non-host: only if not yet ready
  // Classroom: never — teacher controls game flow manually
  const needsAction = isHost ? true : !isCurrentPlayerReady;
  const showCountdown = needsAction && !cancelled && totalPlayers > 0 && !isClassroom;

  const clearCancelFlag = useCallback(() => {
    try { sessionStorage.removeItem('mp-auto-advance-cancelled'); } catch {}
  }, []);

  const handleCountdownComplete = useCallback(() => {
    if (completedRef.current) return;
    if (isHost && !hostHoldExpiredRef.current && !allReady) return;
    completedRef.current = true;
    clearCancelFlag();
    if (isHost) {
      onStartGame();
    } else {
      onMarkReady();
    }
  }, [isHost, onStartGame, onMarkReady, clearCancelFlag, allReady]);

  useEffect(() => {
    if (!showCountdown) return;
    // Only reset countdown on first start — don't restart when players leave
    if (!countdownStartedRef.current) {
      completedRef.current = false;
      setSecondsLeft(AUTO_SECONDS);
      countdownStartedRef.current = true;
    }

    const interval = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          handleCountdownComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [showCountdown, handleCountdownComplete, AUTO_SECONDS]);

  // ---------- Render helpers ----------

  /** Contextual CTA button content */
  function renderCtaButton() {
    const btnBase = 'w-full h-14 border-3 border-black rounded-xl shadow-hard font-black text-base uppercase tracking-tight flex items-center justify-center gap-3';

    // Already ready (non-host) — green check status
    if (!isHost && isCurrentPlayerReady) {
      return (
        <div className={cn(btnBase, 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 pointer-events-none')}>
          <Check className="w-5 h-5 shrink-0" />
          <span>{t('results.youAreReady')}</span>
        </div>
      );
    }

    // Active countdown (both host and non-host)
    if (showCountdown) {
      const btnColor = isRevenge ? 'bg-neo-pink text-white' : 'bg-neo-lime text-neo-black';

      return (
        <div className="flex items-center gap-2" data-testid="auto-countdown">
          <m.button
            data-testid="auto-countdown-cta"
            onClick={handleCountdownComplete}
            aria-disabled={hostStartGated}
            disabled={hostStartGated}
            className={cn(
              btnBase,
              btnColor,
              'relative overflow-hidden',
              hostStartGated && 'opacity-60 cursor-not-allowed'
            )}
            whileTap={hostStartGated ? undefined : { scale: 0.95 }}
          >
            {/* CSS-only progress fill — GPU-composited, no JS animation loop */}
            <div
              className="absolute inset-0 bg-neo-black/15 origin-right will-change-transform"
              ref={(el) => {
                if (el) {
                  // Force browser to acknowledge scaleX(0), then transition to 1
                  el.style.transform = 'scaleX(0)';
                  el.getBoundingClientRect();
                  el.style.transition = `transform ${AUTO_SECONDS}s linear`;
                  el.style.transform = 'scaleX(1)';
                }
              }}
            />
            <span className="relative z-10 flex items-center gap-3">
              {isRevenge && winnerUsername ? (
                <>
                  {isHost ? (
                    <Play className="w-5 h-5 shrink-0" />
                  ) : (
                    <div className="w-7 h-7 rounded-full border-2 border-black overflow-hidden shadow-hard-sm shrink-0 bg-neo-navy">
                      <Avatar userId={winnerUsername} customAvatar={winnerAvatar?.customAvatar} size="sm" className="w-full h-full" />
                    </div>
                  )}
                  <span className="truncate">{t('results.revengeRematch', { player: winnerUsername })}</span>
                </>
              ) : (
                <>
                  {isHost ? (
                    <Play className="w-5 h-5 shrink-0" />
                  ) : (
                    <Crown className="w-5 h-5 shrink-0" />
                  )}
                  <span className="truncate">{t('results.defendTitle')}</span>
                </>
              )}
              <span className="tabular-nums text-sm opacity-70">{secondsLeft}</span>
            </span>
          </m.button>
          <button
            data-testid="auto-countdown-cancel"
            onClick={() => {
              setCancelled(true);
              try { sessionStorage.setItem('mp-auto-advance-cancelled', '1'); } catch {}
            }}
            className="shrink-0 w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-neo-white hover:text-neo-white hover:bg-neo-white/10 transition-colors"
            aria-label={t('autoPlay.exit')}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      );
    }

    // Countdown cancelled — manual buttons

    // Host — manual PLAY AGAIN
    if (isHost) {
      return (
        <m.button
          onClick={() => {
            if (hostStartGated) return;
            clearCancelFlag();
            onStartGame();
          }}
          aria-disabled={hostStartGated}
          disabled={hostStartGated}
          whileTap={hostStartGated ? undefined : { scale: 0.95 }}
          className={cn(
            btnBase,
            isRevenge ? 'bg-neo-pink text-white' : 'bg-neo-lime text-neo-black',
            hostStartGated && 'opacity-60 cursor-not-allowed'
          )}
        >
          {isRevenge && winnerUsername ? (
            <>
              <div className="w-7 h-7 rounded-full border-2 border-black overflow-hidden shadow-hard-sm shrink-0 bg-neo-navy">
                <Avatar userId={winnerUsername} customAvatar={winnerAvatar?.customAvatar} size="sm" className="w-full h-full" />
              </div>
              <span className="truncate">{t('results.revengeRematch', { player: winnerUsername })}</span>
            </>
          ) : (
            <>
              <Play className="w-5 h-5 shrink-0" />
              <span>{t('results.playAgain')}</span>
            </>
          )}
        </m.button>
      );
    }

    // Non-host, not ready, countdown cancelled — manual ready
    if (isRevenge && winnerUsername) {
      return (
        <m.button
          onClick={() => { clearCancelFlag(); onMarkReady(); }}
          whileTap={{ scale: 0.95 }}
          className={cn(btnBase, 'bg-neo-pink text-white')}
        >
          <div className="w-7 h-7 rounded-full border-2 border-black overflow-hidden shadow-hard-sm shrink-0 bg-neo-navy">
            <Avatar userId={winnerUsername} customAvatar={winnerAvatar?.customAvatar} size="sm" className="w-full h-full" />
          </div>
          <span className="truncate">{t('results.revengeRematch', { player: winnerUsername })}</span>
        </m.button>
      );
    }

    // Winner — DEFEND TITLE
    return (
      <m.button
        onClick={() => { clearCancelFlag(); onMarkReady(); }}
        whileTap={{ scale: 0.95 }}
        className={cn(btnBase, 'bg-neo-lime text-neo-black')}
      >
        <Crown className="w-5 h-5 shrink-0" />
        <span className="truncate">{t('results.defendTitle')}</span>
      </m.button>
    );
  }

  // --- Series Complete: show winner + New Series button ---
  if (isSeriesComplete && seriesWinnerUsername) {
    const seriesWinnerAvatar = playerMap.get(seriesWinnerUsername)?.avatar;
    const btnBase = 'w-full h-14 border-3 border-black rounded-xl shadow-hard font-black text-base uppercase tracking-tight flex items-center justify-center gap-3';

    return (
      <div className="flex flex-col gap-2 flex-1 min-w-0">
        {/* Series Winner Banner */}
        <m.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          className="flex items-center justify-center gap-3 py-2"
        >
          <Trophy className="w-6 h-6 text-neo-lime" />
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full border-2 border-neo-lime overflow-hidden shadow-hard-sm bg-neo-navy">
              <Avatar userId={seriesWinnerUsername} customAvatar={seriesWinnerAvatar?.customAvatar} size="sm" className="w-full h-full" />
            </div>
            <span className="text-neo-lime font-black text-sm">{seriesWinnerUsername}</span>
          </div>
          <span className="text-neo-white text-xs font-bold uppercase">{t('results.series.winner')}</span>
        </m.div>

        {/* New Series button (host only starts, non-host just sees the winner) */}
        {isHost && onNewSeries ? (
          <m.button
            onClick={onNewSeries}
            whileTap={{ scale: 0.95 }}
            className={cn(btnBase, 'bg-neo-lime text-neo-black')}
          >
            <Play className="w-5 h-5 shrink-0" />
            <span>{t('results.series.newSeries')}</span>
          </m.button>
        ) : !isHost ? (
          <div className={cn(btnBase, 'bg-neo-white/10 text-neo-white pointer-events-none')}>
            <span>{t('results.series.waitingNewSeries')}</span>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 flex-1 min-w-0 pb-[env(safe-area-inset-bottom)]">
        {/* Host mode selector — always-visible horizontal pills.
            On desktop (desktopProminent) the bar is wide, so the pills grow,
            gain a labelled heading, and the active mode gets a high-contrast
            ring + lift so switching modes reads clearly. */}
        {isHost && selectedGameMode !== undefined && onSelectGameMode && (
          <div className="flex flex-col gap-1 min-w-0">
            {desktopProminent && (
              <div className="text-center text-[10px] font-black uppercase tracking-widest text-neo-white/60">
                {t('results.nextRoundMode')}
              </div>
            )}
            <div className={cn('flex items-center px-0.5 min-w-0', desktopProminent ? 'gap-2' : 'gap-1')}>
              {ALL_MODES.map((mode) => {
                const isActive = selectedGameMode === mode;
                return (
                  <button
                    key={mode}
                    onClick={() => {
                      if (tooltipMode !== mode) {
                        setTooltipMode(mode);
                      }
                      onSelectGameMode(mode);
                    }}
                    onPointerEnter={() => setTooltipMode(mode)}
                    onPointerLeave={(e) => {
                      if (e.pointerType === 'mouse') setTooltipMode(null);
                    }}
                    title={getModeDescription(mode, t)}
                    aria-label={`${getModeLabel(mode, t)} — ${getModeDescription(mode, t)}`}
                    aria-pressed={isActive}
                    className={cn(
                      'flex-1 min-w-0 flex items-center justify-center font-black uppercase rounded-lg border-2 transition-all',
                      desktopProminent
                        ? 'gap-2 py-2.5 px-2 text-[11px]'
                        : 'gap-1.5 py-1.5 px-1 text-[9px]',
                      isActive
                        ? cn(
                            MODE_ACTIVE_COLORS[mode],
                            desktopProminent
                              ? 'border-current shadow-hard-sm scale-105 ring-2 ring-current/40 z-10'
                              : 'border-current/30 shadow-xs'
                          )
                        : cn(
                            'text-neo-white border-transparent hover:text-neo-white hover:bg-neo-white/5',
                            desktopProminent && 'opacity-70 hover:opacity-100'
                          )
                    )}
                  >
                    <span className={cn('shrink-0', desktopProminent ? '[&>svg]:w-4 [&>svg]:h-4' : '[&>svg]:w-3 [&>svg]:h-3')}>{MODE_ICONS[mode]}</span>
                    <span className={cn('truncate', desktopProminent ? 'inline' : 'hidden xs:inline')}>{getModeLabel(mode, t)}</span>
                  </button>
                );
              })}
            </div>
            <div
              className={cn(
                'text-center leading-tight text-neo-white px-2 transition-opacity duration-150',
                desktopProminent ? 'min-h-[16px] text-[11px]' : 'min-h-[14px] text-[10px]'
              )}
              aria-live="polite"
            >
              {(() => {
                const m = tooltipMode ?? selectedGameMode;
                return m ? getModeDescription(m, t) : '';
              })()}
            </div>
          </div>
        )}

        {/* Contextual CTA button */}
        {renderCtaButton()}

        {/* Status Footer — ready avatar stack (excludes host — host clicks Start, not Ready) */}
        {totalPlayers > 0 && (
          <div className="flex items-center justify-center gap-4" aria-live="polite" aria-label={`${readyCount}/${totalPlayers}`}>
            {/* Avatar dots with colored rings — bots always show as ready */}
            <div className="flex -space-x-1.5 rtl:space-x-reverse">
              {nonHostPlayers.slice(0, 6).map((player) => {
                const isReady = player.isBot || readySet.has(player.username);
                return (
                  <div
                    key={player.username}
                    className={cn(
                      'w-6 h-6 rounded-full border-2 overflow-hidden',
                      isReady ? 'border-neo-lime' : 'border-white/10 opacity-40'
                    )}
                  >
                    <Avatar
                      customAvatar={player.avatar?.customAvatar}
                      userId={player.username}
                      size="sm"
                      className="w-full h-full rounded-full"
                    />
                  </div>
                );
              })}
            </div>
            <span className="text-[11px] font-black text-neo-lime uppercase tracking-widest">
              {readyCount} / {totalPlayers} {t('results.ready')}
            </span>
          </div>
        )}
    </div>
  );
}
