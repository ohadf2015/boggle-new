import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaRobot, FaPlus, FaTimes } from 'react-icons/fa';
import { Badge } from './ui/badge';
import { cn } from '../lib/utils';
import { useLanguage } from '../contexts/LanguageContext';
import type { Socket } from 'socket.io-client';

type BotDifficulty = 'easy' | 'medium' | 'hard';

interface BotDifficultyOption {
  value: BotDifficulty;
  labelKey: string;
  color: string;
  descKey: string;
  defaultDesc: string;
}

const BOT_DIFFICULTIES: BotDifficultyOption[] = [
  {
    value: 'easy',
    labelKey: 'bots.easy',
    color: 'bg-neo-lime',
    descKey: 'bots.easyDesc',
    defaultDesc: '3-5 letter words, slower pace'
  },
  {
    value: 'medium',
    labelKey: 'bots.medium',
    color: 'bg-neo-yellow',
    descKey: 'bots.mediumDesc',
    defaultDesc: 'Balanced mix of words'
  },
  {
    value: 'hard',
    labelKey: 'bots.hard',
    color: 'bg-neo-red text-white',
    descKey: 'bots.hardDesc',
    defaultDesc: 'Long words, fast pace'
  },
];

// Flexible player type for bot controls - only needs these properties
interface BotControlsPlayer {
  username: string;
  isBot?: boolean;
  botDifficulty?: BotDifficulty;
  avatar?: {
    emoji?: string;
    color?: string;
    profilePictureUrl?: string | null;
  } | null;
}

interface BotControlsProps {
  socket: Socket | null;
  gameCode: string;
  players?: BotControlsPlayer[];
  disabled?: boolean;
  maxPlayers?: number;
}

/**
 * Bot Controls Component
 * Allows host to add/remove AI bots to the game
 */
const BotControls: React.FC<BotControlsProps> = ({
  socket,
  gameCode,
  players = [] as BotControlsPlayer[],
  disabled = false,
  maxPlayers = 50,
}) => {
  const { t } = useLanguage();
  const [selectedDifficulty, setSelectedDifficulty] = useState<BotDifficulty>('medium');
  const [isAdding, setIsAdding] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Get current bots from players list
  const bots = players.filter(p => p.isBot === true);
  const playerCount = players.length;
  const canAddMore = playerCount < maxPlayers;

  // Suppress unused variable warning
  void gameCode;

  // Listen for socket events
  useEffect(() => {
    if (!socket) return;

    const handleBotAdded = (): void => {
      setIsAdding(false);
      setError(null);
    };

    const handleBotRemoved = (data: { success?: boolean }): void => {
      if (!data.success) {
        setError(t('bots.removeError') || 'Failed to remove bot');
      }
    };

    const handleError = (message: string | { message: string }): void => {
      setIsAdding(false);
      const errorMsg = typeof message === 'string' ? message : message.message;
      if (errorMsg && errorMsg.toLowerCase().includes('bot')) {
        setError(errorMsg);
        setTimeout(() => setError(null), 3000);
      }
    };

    socket.on('botAdded', handleBotAdded);
    socket.on('botRemoved', handleBotRemoved);
    socket.on('error', handleError);

    return () => {
      socket.off('botAdded', handleBotAdded);
      socket.off('botRemoved', handleBotRemoved);
      socket.off('error', handleError);
    };
  }, [socket, t]);

  const handleRemoveBot = useCallback((botUsername: string): void => {
    if (!socket || disabled) return;
    socket.emit('removeBot', { botUsername });
  }, [socket, disabled]);

  // Add bot with selected difficulty
  const handleQuickAdd = useCallback((e: React.MouseEvent<HTMLButtonElement>): void => {
    e.stopPropagation();
    if (!socket || !canAddMore || isAdding || disabled) return;

    setIsAdding(true);
    setError(null);
    socket.emit('addBot', { difficulty: selectedDifficulty });

    setTimeout(() => setIsAdding(false), 3000);
  }, [socket, selectedDifficulty, canAddMore, isAdding, disabled]);

  return (
    <div className="space-y-2">
      {/* Header - Compact */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FaRobot className="text-neo-cyan text-sm" />
          <span className="text-xs font-bold uppercase text-neo-cream/80">
            {t('bots.title') || 'AI Bots'}
          </span>
          {bots.length > 0 && (
            <Badge className="bg-neo-cyan text-neo-black text-[10px] px-1.5 py-0 font-bold">
              {bots.length}
            </Badge>
          )}
        </div>

        {/* Quick Add Button */}
        {canAddMore && (
          <motion.button
            type="button"
            onClick={handleQuickAdd}
            disabled={isAdding || disabled}
            whileTap={{ scale: 0.95 }}
            className={cn(
              "flex items-center gap-1 px-2 py-1 rounded-neo text-xs font-bold",
              "bg-neo-cyan text-neo-black border-2 border-neo-black shadow-hard-sm",
              "hover:shadow-hard hover:translate-x-[-1px] hover:translate-y-[-1px]",
              "active:shadow-none active:translate-x-[1px] active:translate-y-[1px]",
              "transition-all duration-100",
              (isAdding || disabled) && "opacity-50 cursor-not-allowed"
            )}
          >
            <FaPlus size={8} />
            {isAdding ? '...' : (t('bots.quickAdd') || 'Add')}
          </motion.button>
        )}
      </div>

      {/* Error Message */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="text-[10px] text-neo-red bg-neo-red/10 px-2 py-1 rounded-neo border border-neo-red/30"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Difficulty Selection - Inline compact */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-[10px] font-bold uppercase text-neo-cream/60">
          {t('bots.selectDifficulty') || 'Difficulty'}:
        </span>
        {BOT_DIFFICULTIES.map((diff) => {
          const isSelected = selectedDifficulty === diff.value;
          return (
            <motion.button
              key={diff.value}
              type="button"
              onClick={() => setSelectedDifficulty(diff.value)}
              whileTap={{ scale: 0.95 }}
              className={cn(
                "px-1.5 py-0.5 rounded text-[10px] font-bold transition-all duration-100 border border-neo-black",
                isSelected
                  ? `${diff.color} shadow-none`
                  : "bg-neo-cream/80 text-neo-black hover:bg-neo-cream"
              )}
            >
              {t(diff.labelKey) || diff.value}
            </motion.button>
          );
        })}
      </div>

      {/* Current Bots List - Compact */}
      {bots.length > 0 && (
        <div className="space-y-1">
          <div className="flex flex-wrap gap-1.5">
            <AnimatePresence mode="popLayout">
              {bots.map((bot) => (
                <motion.div
                  key={bot.username}
                  layout
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="flex items-center gap-1 bg-neo-black/30 rounded-full px-2 py-0.5 border border-neo-cream/20"
                >
                  <span
                    className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] shrink-0"
                    style={{ backgroundColor: bot.avatar?.color || '#60a5fa' }}
                  >
                    {bot.avatar?.emoji || '🤖'}
                  </span>
                  <span className="text-[10px] text-neo-cream/80 font-medium truncate max-w-[60px]">
                    {bot.username}
                  </span>
                  <Badge className={cn(
                    "text-[8px] px-1 py-0 shrink-0",
                    bot.botDifficulty === 'easy' ? 'bg-neo-lime text-neo-black' :
                    bot.botDifficulty === 'hard' ? 'bg-neo-red text-white' :
                    'bg-neo-yellow text-neo-black'
                  )}>
                    {(t(`bots.${bot.botDifficulty || 'medium'}`) || bot.botDifficulty || 'M').charAt(0)}
                  </Badge>
                  <motion.button
                    type="button"
                    onClick={() => handleRemoveBot(bot.username)}
                    disabled={disabled}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    className="text-neo-red/60 hover:text-neo-red transition-colors shrink-0"
                    title={t('bots.remove') || 'Remove bot'}
                  >
                    <FaTimes size={8} />
                  </motion.button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Empty State - Minimal */}
      {bots.length === 0 && (
        <p className="text-[10px] text-neo-cream/50 text-center">
          {t('bots.emptyState') || 'Add bots to practice or fill the room'}
        </p>
      )}
    </div>
  );
};

export default BotControls;
