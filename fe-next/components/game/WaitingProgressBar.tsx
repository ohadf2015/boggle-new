'use client';

import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, CheckCircle2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Milestone {
  count: number;
  label: string;
  icon?: React.ReactNode;
}

interface WaitingProgressBarProps {
  currentPlayers: number;
  t: (path: string, params?: Record<string, string | number>) => string;
  className?: string;
}

const DEFAULT_MILESTONES: Milestone[] = [
  { count: 1, label: 'First player!' },
  { count: 3, label: 'Party starting!' },
  { count: 5, label: 'Full house!' },
];

export function WaitingProgressBar({ currentPlayers, t, className }: WaitingProgressBarProps) {
  const milestones = useMemo(() => [
    { count: 1, label: t('waiting.milestoneFirst') || 'First player!' },
    { count: 3, label: t('waiting.milestoneParty') || 'Party starting!' },
    { count: 5, label: t('waiting.milestoneFull') || 'Full house!' },
  ], [t]);

  const maxMilestone = milestones[milestones.length - 1].count;
  const progressPercent = Math.min((currentPlayers / maxMilestone) * 100, 100);

  return (
    <div className={cn("w-full", className)}>
      {/* Progress bar container */}
      <div className="relative">
        {/* Background track */}
        <div className="h-3 bg-neo-black/30 rounded-full border-2 border-neo-black/50 overflow-hidden">
          {/* Fill */}
          <motion.div
            className="h-full bg-gradient-to-r from-neo-lime via-neo-orange to-neo-pink"
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>

        {/* Milestone markers */}
        <div className="absolute top-0 left-0 right-0 h-full flex items-center">
          {milestones.map((milestone, index) => {
            const position = (milestone.count / maxMilestone) * 100;
            const isReached = currentPlayers >= milestone.count;
            const isLatestReached = isReached && (index === milestones.length - 1 || currentPlayers < milestones[index + 1]?.count);

            return (
              <div
                key={milestone.count}
                className="absolute transform -translate-x-1/2"
                style={{ left: `${position}%` }}
              >
                <motion.div
                  initial={{ scale: 0.8 }}
                  animate={{
                    scale: isLatestReached ? [1, 1.2, 1] : 1,
                    y: isReached ? 0 : 2
                  }}
                  transition={{
                    scale: { duration: 0.3, repeat: isLatestReached ? Infinity : 0, repeatDelay: 1 }
                  }}
                  className={cn(
                    "w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-colors",
                    isReached
                      ? "bg-neo-lime border-neo-black text-neo-black"
                      : "bg-slate-700 border-slate-500 text-slate-400"
                  )}
                >
                  {isReached ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    milestone.count
                  )}
                </motion.div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Milestone labels */}
      <div className="relative mt-4 flex justify-between text-xs font-medium">
        {milestones.map((milestone) => {
          const isReached = currentPlayers >= milestone.count;
          return (
            <div
              key={milestone.count}
              className={cn(
                "text-center transition-colors",
                isReached ? "text-neo-lime" : "text-neo-cream/50"
              )}
            >
              {milestone.label}
            </div>
          );
        })}
      </div>

      {/* Current status message */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentPlayers}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="mt-4 text-center"
        >
          {currentPlayers === 0 && (
            <div className="flex items-center justify-center gap-2 text-neo-cream/70">
              <Users className="w-4 h-4" />
              <span className="text-sm font-medium">{t('waiting.waitingForPlayers') || 'Waiting for players to join...'}</span>
            </div>
          )}
          {currentPlayers === 1 && (
            <div className="flex items-center justify-center gap-2 text-neo-lime">
              <Sparkles className="w-4 h-4" />
              <span className="text-sm font-bold">{t('waiting.oneMoreNeeded') || 'Invite friends to get started!'}</span>
            </div>
          )}
          {currentPlayers >= 2 && currentPlayers < 5 && (
            <div className="flex items-center justify-center gap-2 text-neo-lime">
              <CheckCircle2 className="w-4 h-4" />
              <span className="text-sm font-bold">{t('waiting.readyToStart') || 'Ready to start! More players = more fun!'}</span>
            </div>
          )}
          {currentPlayers >= 5 && (
            <div className="flex items-center justify-center gap-2 text-neo-pink">
              <Sparkles className="w-4 h-4" />
              <span className="text-sm font-bold">{t('waiting.fullHouse') || 'Full house! Let the battle begin!'}</span>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

export default WaitingProgressBar;
