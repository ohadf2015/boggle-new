'use client';

import { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Play, Crown, Check, X } from 'lucide-react';
import Avatar from '@/components/Avatar';
import { useLanguage } from '@/contexts/LanguageContext';
import { MODE_ICONS, MODE_ACTIVE_COLORS, getModeLabel, type GameModeOption } from '@/components/GameModeSelector';
import { cn } from '@/lib/utils';
import type { Avatar as AvatarType } from '@/types';

interface PlayerInfo {
  username: string;
  avatar?: AvatarType;
  isBot?: boolean;
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
}

const ALL_MODES: GameModeOption[] = ['word-hunt', 'blast', 'classic', 'random'];
const AUTO_SECONDS = 15;

/**
 * Inline ready bar — renders as flex items inside a parent floating bar.
 * No fixed positioning or background — the parent ResultsPage handles that.
 *
 * All players (host + non-host) get a 21s auto-countdown.
 * - Host: auto-starts game after 21s
 * - Non-host: auto-marks ready after 21s
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
  totalPlayers: rawTotalPlayers,
  readyUsernames = [],
  players = [],
  onStartGame,
  onMarkReady,
  selectedGameMode,
  onSelectGameMode,
}: StickyReadyBarProps) {
  const { t } = useLanguage();

  const isRevenge = currentPlayerRank > 1 && !!winnerUsername;

  // Count bots as always-ready for display purposes
  const botCount = useMemo(() => players.filter(p => p.isBot).length, [players]);
  const readyCount = rawReadyCount + botCount;
  const totalPlayers = rawTotalPlayers;

  const readySet = useMemo(() => new Set(readyUsernames), [readyUsernames]);

  const playerMap = useMemo(() => {
    const map = new Map<string, PlayerInfo>();
    for (const p of players) map.set(p.username, p);
    return map;
  }, [players]);

  const winnerAvatar = winnerUsername ? playerMap.get(winnerUsername)?.avatar : undefined;

  // ---------- Unified 21s countdown for ALL players ----------
  const [cancelled, setCancelled] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(AUTO_SECONDS);
  const completedRef = useRef(false);
  const countdownStartedRef = useRef(false);

  // Determine if we should show auto-countdown
  // Host: always (auto-starts game)
  // Non-host: only if not yet ready
  const needsAction = isHost ? true : !isCurrentPlayerReady;
  const showCountdown = needsAction && !cancelled && totalPlayers > 0;

  const handleCountdownComplete = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    if (isHost) {
      onStartGame();
    } else {
      onMarkReady();
    }
  }, [isHost, onStartGame, onMarkReady]);

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
            <motion.div
              className="absolute inset-0 bg-neo-black/15 origin-right"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: AUTO_SECONDS, ease: 'linear' }}
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
            onClick={() => setCancelled(true)}
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
          onClick={onStartGame}
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
          onClick={onMarkReady}
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
        onClick={onMarkReady}
        whileTap={{ scale: 0.95 }}
        className={cn(btnBase, 'bg-neo-lime text-neo-black')}
      >
        <Crown className="w-5 h-5 shrink-0" />
        <span className="truncate">{t('results.defendTitle')}</span>
      </motion.button>
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
                      ? cn(MODE_ACTIVE_COLORS[mode], 'border-current/30 shadow-sm')
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

        {/* Status Footer — ready avatar stack (show ALL players including host) */}
        {totalPlayers > 0 && (
          <div className="flex items-center justify-center gap-4" aria-live="polite" aria-label={`${readyCount}/${totalPlayers}`}>
            {/* Avatar dots with colored rings — bots always show as ready */}
            <div className="flex -space-x-1.5 rtl:space-x-reverse">
              {players.slice(0, 6).map((player) => {
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
