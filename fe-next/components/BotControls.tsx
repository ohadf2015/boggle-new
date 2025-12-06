import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaRobot, FaPlus, FaTimes, FaChevronDown, FaChevronUp } from 'react-icons/fa';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import Avatar from './Avatar';
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
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [selectedDifficulty, setSelectedDifficulty] = useState<BotDifficulty>('medium');
  const [isAdding, setIsAdding] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Get current bots from players list
  const bots = players.filter(p => p.isBot === true);
  const playerCount = players.length;
  const canAddMore = playerCount < maxPlayers;

  // Listen for socket events
  useEffect(() => {
    if (!socket) return;

    const handleBotAdded = (data: { success?: boolean }): void => {
      setIsAdding(false);
      setError(null);
      if (data.success) {
        // Auto-expand to show the new bot
        setIsExpanded(true);
      }
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

  const handleAddBot = useCallback(() => {
    if (!socket || !canAddMore || isAdding || disabled) return;

    setIsAdding(true);
    setError(null);
    socket.emit('addBot', { difficulty: selectedDifficulty });

    // Reset adding state after timeout (in case socket event doesn't fire)
    const timeout = setTimeout(() => {
      setIsAdding(false);
    }, 3000);

    return () => clearTimeout(timeout);
  }, [socket, selectedDifficulty, canAddMore, isAdding, disabled]);

  const handleRemoveBot = useCallback((botUsername: string): void => {
    if (!socket || disabled) return;
    socket.emit('removeBot', { botUsername });
  }, [socket, disabled]);

  const toggleExpanded = useCallback(() => {
    setIsExpanded(prev => !prev);
  }, []);

  // Quick add button for when collapsed
  const handleQuickAdd = useCallback((e: React.MouseEvent<HTMLButtonElement>): void => {
    e.stopPropagation();
    if (!socket || !canAddMore || isAdding || disabled) return;

    setIsAdding(true);
    setError(null);
    socket.emit('addBot', { difficulty: 'medium' });

    setTimeout(() => setIsAdding(false), 3000);
  }, [socket, canAddMore, isAdding, disabled]);

  return (
    <div className="space-y-3">
      {/* Header with Toggle and Quick Add */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={toggleExpanded}
          className="flex items-center gap-2 py-2 text-neo-cream/80 hover:text-neo-cream transition-colors duration-100"
        >
          <FaRobot className="text-neo-cyan text-lg" />
          <span className="text-sm font-bold uppercase">
            {t('bots.title') || 'AI Bots'}
          </span>
          {bots.length > 0 && (
            <Badge className="bg-neo-cyan text-neo-black text-xs px-2 py-0.5 font-bold">
              {bots.length}
            </Badge>
          )}
          {isExpanded ? <FaChevronUp className="ml-1" /> : <FaChevronDown className="ml-1" />}
        </button>

        {/* Quick Add Button - Always visible */}
        {!isExpanded && canAddMore && (
          <motion.button
            type="button"
            onClick={handleQuickAdd}
            disabled={isAdding || disabled}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={cn(
              "flex items-center gap-1 px-3 py-1.5 rounded-neo text-sm font-bold",
              "bg-neo-cyan text-neo-black border-2 border-neo-black shadow-hard-sm",
              "hover:shadow-hard hover:translate-x-[-1px] hover:translate-y-[-1px]",
              "active:shadow-none active:translate-x-[1px] active:translate-y-[1px]",
              "transition-all duration-100",
              (isAdding || disabled) && "opacity-50 cursor-not-allowed"
            )}
          >
            <FaPlus size={10} />
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
            className="text-xs text-neo-red bg-neo-red/10 px-3 py-2 rounded-neo border border-neo-red/30"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Expandable Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="space-y-4 bg-neo-black/20 rounded-neo p-3 border border-neo-cream/10">
              {/* Difficulty Selection */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-neo-cream/60">
                  {t('bots.selectDifficulty') || 'Choose Difficulty'}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {BOT_DIFFICULTIES.map((diff) => {
                    const isSelected = selectedDifficulty === diff.value;
                    return (
                      <motion.button
                        key={diff.value}
                        type="button"
                        onClick={() => setSelectedDifficulty(diff.value)}
                        whileTap={{ scale: 0.95 }}
                        className={cn(
                          "px-2 py-2 rounded-neo font-bold text-xs transition-all duration-100 border-2 border-neo-black",
                          isSelected
                            ? `${diff.color} shadow-none translate-x-[1px] translate-y-[1px]`
                            : "bg-neo-cream text-neo-black shadow-hard-sm hover:shadow-hard hover:translate-x-[-1px] hover:translate-y-[-1px]"
                        )}
                      >
                        {t(diff.labelKey) || diff.value}
                      </motion.button>
                    );
                  })}
                </div>
                <p className="text-xs text-neo-cream/50 text-center">
                  {t(BOT_DIFFICULTIES.find(d => d.value === selectedDifficulty)?.descKey || '') ||
                   BOT_DIFFICULTIES.find(d => d.value === selectedDifficulty)?.defaultDesc}
                </p>
              </div>

              {/* Add Bot Button */}
              <Button
                onClick={handleAddBot}
                disabled={!canAddMore || isAdding || disabled}
                className="w-full bg-neo-cyan text-neo-black hover:bg-neo-cyan/90 font-bold"
              >
                {isAdding ? (
                  <span className="flex items-center gap-2">
                    <motion.span
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    >
                      <FaRobot />
                    </motion.span>
                    {t('bots.adding') || 'Adding...'}
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <FaPlus />
                    {t('bots.addBot') || 'Add Bot'}
                  </span>
                )}
              </Button>

              {/* Current Bots List */}
              {bots.length > 0 && (
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-neo-cream/60">
                    {t('bots.currentBots') || 'Bots in Room'} ({bots.length})
                  </label>
                  <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                    <AnimatePresence mode="popLayout">
                      {bots.map((bot) => (
                        <motion.div
                          key={bot.username}
                          layout
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8, x: 50 }}
                          className="flex items-center justify-between bg-neo-black/30 rounded-neo px-3 py-2 border border-neo-cream/20"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <Avatar
                              avatarEmoji={bot.avatar?.emoji}
                              avatarColor={bot.avatar?.color}
                              size="sm"
                            />
                            <div className="min-w-0 flex-1">
                              <span className="text-sm font-bold text-neo-cream truncate block">
                                {bot.username}
                              </span>
                            </div>
                            <Badge className={cn(
                              "text-xs px-1.5 py-0 shrink-0",
                              bot.botDifficulty === 'easy' ? 'bg-neo-lime text-neo-black' :
                              bot.botDifficulty === 'hard' ? 'bg-neo-red text-white' :
                              'bg-neo-yellow text-neo-black'
                            )}>
                              {t(`bots.${bot.botDifficulty || 'medium'}`) || bot.botDifficulty || 'medium'}
                            </Badge>
                          </div>
                          <motion.button
                            type="button"
                            onClick={() => handleRemoveBot(bot.username)}
                            disabled={disabled}
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            className="text-neo-red/70 hover:text-neo-red transition-colors p-1.5 ml-2 shrink-0"
                            title={t('bots.remove') || 'Remove bot'}
                          >
                            <FaTimes size={12} />
                          </motion.button>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </div>
              )}

              {/* Empty State / Help Text */}
              {bots.length === 0 && (
                <div className="text-center py-2">
                  <p className="text-xs text-neo-cream/50">
                    {t('bots.emptyState') || 'Add bots to practice or fill the room!'}
                  </p>
                </div>
              )}

              {/* Info Text */}
              <p className="text-xs text-neo-cream/40 text-center border-t border-neo-cream/10 pt-3">
                {t('bots.helpText') || 'Bots find and submit words automatically during the game.'}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Collapsed State - Show bot avatars preview */}
      {!isExpanded && bots.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-1 pl-6"
        >
          {bots.slice(0, 5).map((bot, index) => (
            <motion.div
              key={bot.username}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: index * 0.05 }}
              className="w-6 h-6 rounded-full flex items-center justify-center text-xs border border-neo-black"
              style={{ backgroundColor: bot.avatar?.color || '#60a5fa' }}
              title={bot.username}
            >
              {bot.avatar?.emoji || '🤖'}
            </motion.div>
          ))}
          {bots.length > 5 && (
            <span className="text-xs text-neo-cream/50 ml-1">
              +{bots.length - 5}
            </span>
          )}
        </motion.div>
      )}
    </div>
  );
};

export default BotControls;
