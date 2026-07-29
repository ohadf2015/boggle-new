'use client';

/**
 * VaultCard Component
 * Landing page card showing the active vault board with countdown,
 * mini leaderboard, and CTA. When no vault is active, shows a teaser.
 */

import React, { useState, useEffect } from 'react';
import { LockOpen, Lock, Clock, Trophy } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { AdaptiveMotion, AdaptiveAnimatePresence } from '@/components/motion/AdaptiveMotion';
import { cn } from '@/lib/utils';
import { formatCountdownFromMs } from '@/shared/utils';

interface VaultBoard {
  id: string;
  board_name: string;
  grid: unknown;
  language: string;
  opens_at: string;
  closes_at: string;
  is_active: boolean;
  created_at: string;
}

interface VaultScore {
  id: string;
  vault_board_id: string;
  player_id: string;
  score: number;
  words_found: number;
  display_name?: string;
}

interface VaultCardProps {
  vault: VaultBoard | null;
  leaderboard: VaultScore[];
  timeRemaining: number;
  isActive: boolean;
  nextOpensIn?: number;
  onEnter?: () => void;
  className?: string;
}

const MEDAL_COLORS = ['#FFD700', '#C0C0C0', '#CD7F32'] as const;

const VaultCard: React.FC<VaultCardProps> = ({
  vault,
  leaderboard,
  timeRemaining,
  isActive,
  nextOpensIn,
  onEnter,
  className,
}) => {
  const { t } = useLanguage();
  const [localTime, setLocalTime] = useState(timeRemaining);

  useEffect(() => {
    setLocalTime(timeRemaining);
  }, [timeRemaining]);

  useEffect(() => {
    if (!isActive && !nextOpensIn) return;
    const interval = setInterval(() => {
      setLocalTime((prev) => Math.max(0, prev - 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [isActive, nextOpensIn]);

  const top3 = leaderboard.slice(0, 3);
  const countdownStr = formatCountdownFromMs(isActive ? localTime : (nextOpensIn ?? 0));

  if (!isActive && !nextOpensIn) return null;

  // Teaser state: no active vault
  if (!isActive) {
    return (
      <div
        data-testid="vault-teaser"
        className={cn(
          'relative border-3 border-neo-yellow/40 rounded-neo shadow-hard p-5',
          'bg-linear-to-br from-neo-navy via-neo-navy/95 to-neo-navy/80',
          className
        )}
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-neo border-2 border-black bg-neo-yellow/20 flex items-center justify-center">
            <Lock size={20} className="text-neo-yellow/60" />
          </div>
          <h3 className="font-neo-display text-lg font-bold text-neo-yellow/70">
            {t('vault.title')}
          </h3>
        </div>
        <p className="text-sm text-white">
          {t('vault.nextVault', { time: countdownStr })}
        </p>
      </div>
    );
  }

  // Active vault state
  return (
    <AdaptiveAnimatePresence>
      <AdaptiveMotion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <div
          data-testid="vault-card"
          className={cn(
            'relative border-3 border-neo-yellow rounded-neo shadow-hard-lg p-5',
            'bg-linear-to-br from-neo-navy via-neo-navy/95 to-neo-navy/80',
            className
          )}
        >
          {/* Header */}
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-neo border-2 border-black bg-neo-yellow flex items-center justify-center animate-pulse">
              <LockOpen size={20} className="text-black" />
            </div>
            <div>
              <h3 className="font-neo-display text-lg font-bold text-neo-yellow">
                {t('vault.title')}
              </h3>
              <p className="text-xs text-neo-yellow/80 font-bold uppercase tracking-wide">
                {t('vault.open')}
              </p>
            </div>
          </div>

          {/* Board name */}
          {vault && (
            <p className="font-neo-display text-xl font-bold text-white mb-2">
              {vault.board_name}
            </p>
          )}

          {/* Countdown */}
          <div
            className="flex items-center gap-2 mb-4"
            data-testid="vault-countdown"
          >
            <Clock size={14} className="text-neo-yellow/70" />
            <span className="text-sm font-mono text-white">
              {t('vault.closesIn', { time: countdownStr })}
            </span>
          </div>

          {/* Mini leaderboard */}
          {top3.length > 0 && (
            <div className="mb-4">
              <h4 className="text-xs font-bold text-white uppercase tracking-wide mb-2">
                {t('vault.leaderboard')}
              </h4>
              <div className="space-y-1">
                {top3.map((entry, i) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between px-2 py-1 rounded bg-white/5"
                  >
                    <div className="flex items-center gap-2">
                      <Trophy
                        size={14}
                        style={{ color: MEDAL_COLORS[i] ?? 'rgb(var(--neo-white))' }}
                      />
                      <span className="text-sm text-white font-medium truncate max-w-[120px]">
                        {entry.display_name ?? `Player ${i + 1}`}
                      </span>
                    </div>
                    <span className="text-sm font-mono text-neo-yellow font-bold">
                      {entry.score}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CTA */}
          <button
            onClick={onEnter}
            className={cn(
              'w-full px-4 py-3 rounded-neo border-3 border-black',
              'bg-neo-yellow text-black font-neo-display font-bold text-base',
              'shadow-hard hover:shadow-hard-pressed active:translate-y-0.5',
              'transition-all duration-150'
            )}
          >
            {t('vault.enterVault')}
          </button>
        </div>
      </AdaptiveMotion.div>
    </AdaptiveAnimatePresence>
  );
};

export default VaultCard;
