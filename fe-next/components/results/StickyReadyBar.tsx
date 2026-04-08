'use client';

import { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Play, Crown, Check, X, Trophy } from 'lucide-react';
import Avatar from '@/components/Avatar';
import { useLanguage } from '@/contexts/LanguageContext';
import { MODE_ICONS, MODE_ACTIVE_COLORS, getModeLabel, type GameModeOption } from '@/components/GameModeSelector';
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
}

const ALL_MODES: GameModeOption[] = ['word-hunt', 'blast', 'classic', 'random'];
const AUTO_SECONDS = 35;

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
}: StickyReadyBarProps) {
  const { t } = useLanguage();

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
  // Persist cancellation across game rounds via sessionStorage
  const [cancelled, setCancelled] = useState(() => {
    try { return sessionStorage.getItem('mp-auto-advance-cancelled') === '1'; }
    catch { return false; }
  });
  const [secondsLeft, setSecondsLeft] = useState(AUTO_SECONDS);
  const completedRef = useRef(false);
  const countdownStartedRef = useRef(false);

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
    completedRef.current = true;
    clearCancelFlag();
    if (isHost) {
      onStartGame();
    } else {
      onMarkReady();
    }
  }, [isHost, onStartGame, onMarkReady, clearCancelFlag]);

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
  }, [showCountdown, handleCountdownComplete]);

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
          <motion.button
            data-testid="auto-countdown-cta"
            onClick={handleCountdownComplete}
            className={cn(btnBase, btnColor, 'relative overflow-hidden')}
            whileTap={{ scale: 0.95 }}
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
                  <div className="w-7 h-7 rounded-full border-2 border-black overflow-hidden shadow-hard-sm shrink-0 bg-neo-navy">
                    <Avatar userId={winnerUsername} customAvatar={winnerAvatar?.customAvatar} size="sm" className="w-full h-full" />
                  </div>
                  <span className="truncate">{t('results.revengeRematch', { player: winnerUsername })}</span>
                </>
              ) : (
                <>
                  <Crown className="w-5 h-5 shrink-0" />
                  <span className="truncate">{t('results.defendTitle')}</span>
                </>
              )}
              <span className="tabular-nums text-sm opacity-70">{secondsLeft}</span>
            </span>
          </motion.button>
          <button
            data-testid="auto-countdown-cancel"
            onClick={() => {
              setCancelled(true);
              try { sessionStorage.setItem('mp-auto-advance-cancelled', '1'); } catch {}
            }}
            className="shrink-0 w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-neo-white/40 hover:text-neo-white/80 hover:bg-neo-white/10 transition-colors"
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
        <motion.button
          onClick={() => { clearCancelFlag(); onStartGame(); }}
          whileTap={{ scale: 0.95 }}
          className={cn(btnBase, isRevenge ? 'bg-neo-pink text-white' : 'bg-neo-lime text-neo-black')}
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
        </motion.button>
      );
    }

    // Non-host, not ready, countdown cancelled — manual ready
    if (isRevenge && winnerUsername) {
      return (
        <motion.button
          onClick={() => { clearCancelFlag(); onMarkReady(); }}
          whileTap={{ scale: 0.95 }}
          className={cn(btnBase, 'bg-neo-pink text-white')}
        >
          <div className="w-7 h-7 rounded-full border-2 border-black overflow-hidden shadow-hard-sm shrink-0 bg-neo-navy">
            <Avatar userId={winnerUsername} customAvatar={winnerAvatar?.customAvatar} size="sm" className="w-full h-full" />
          </div>
          <span className="truncate">{t('results.revengeRematch', { player: winnerUsername })}</span>
        </motion.button>
      );
    }

    // Winner — DEFEND TITLE
    return (
      <motion.button
        onClick={() => { clearCancelFlag(); onMarkReady(); }}
        whileTap={{ scale: 0.95 }}
        className={cn(btnBase, 'bg-neo-lime text-neo-black')}
      >
        <Crown className="w-5 h-5 shrink-0" />
        <span className="truncate">{t('results.defendTitle')}</span>
      </motion.button>
    );
  }

  // --- Series Complete: show winner + New Series button ---
  if (isSeriesComplete && seriesWinnerUsername) {
    const seriesWinnerAvatar = playerMap.get(seriesWinnerUsername)?.avatar;
    const btnBase = 'w-full h-14 border-3 border-black rounded-xl shadow-hard font-black text-base uppercase tracking-tight flex items-center justify-center gap-3';

    return (
      <div className="flex flex-col gap-2 flex-1 min-w-0 pb-[env(safe-area-inset-bottom)]">
        {/* Series Winner Banner */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          className="flex items-center justify-center gap-3 py-2"
        >
          <Trophy className="w-6 h-6 text-neo-yellow" />
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full border-2 border-neo-yellow overflow-hidden shadow-hard-sm bg-neo-navy">
              <Avatar userId={seriesWinnerUsername} customAvatar={seriesWinnerAvatar?.customAvatar} size="sm" className="w-full h-full" />
            </div>
            <span className="text-neo-yellow font-black text-sm">{seriesWinnerUsername}</span>
          </div>
          <span className="text-neo-cream/60 text-xs font-bold uppercase">{t('results.series.winner')}</span>
        </motion.div>

        {/* New Series button (host only starts, non-host just sees the winner) */}
        {isHost && onNewSeries ? (
          <motion.button
            onClick={onNewSeries}
            whileTap={{ scale: 0.95 }}
            className={cn(btnBase, 'bg-neo-lime text-neo-black')}
          >
            <Play className="w-5 h-5 shrink-0" />
            <span>{t('results.series.newSeries')}</span>
          </motion.button>
        ) : !isHost ? (
          <div className={cn(btnBase, 'bg-neo-white/10 text-neo-cream/60 pointer-events-none')}>
            <span>{t('results.series.waitingNewSeries')}</span>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 flex-1 min-w-0 pb-[env(safe-area-inset-bottom)]">
        {/* Host mode selector — always-visible horizontal pills */}
        {isHost && selectedGameMode !== undefined && onSelectGameMode && (
          <div className="flex items-center gap-1 px-0.5">
            {ALL_MODES.map((mode) => {
              const isActive = selectedGameMode === mode;
              return (
                <button
                  key={mode}
                  onClick={() => onSelectGameMode(mode)}
                  aria-label={getModeLabel(mode, t)}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-1.5 py-1.5 text-[9px] font-black uppercase rounded-lg border-2 transition-all',
                    isActive
                      ? cn(MODE_ACTIVE_COLORS[mode], 'border-current/30 shadow-xs')
                      : 'text-neo-cream/40 border-transparent hover:text-neo-cream/70 hover:bg-neo-white/5'
                  )}
                >
                  <span className="[&>svg]:w-3 [&>svg]:h-3">{MODE_ICONS[mode]}</span>
                  <span className="hidden xs:inline">{getModeLabel(mode, t)}</span>
                </button>
              );
            })}
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
