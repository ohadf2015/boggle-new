import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaRobot, FaPlus, FaTimes, FaMagic, FaChevronDown } from 'react-icons/fa';
import { Badge } from './ui/badge';
import { Switch } from './ui/switch';
import { cn } from '../lib/utils';
import { useLanguage } from '../contexts/LanguageContext';
import { useAutoFillBots } from '../hooks/useAutoFillBots';
import type { Socket } from 'socket.io-client';

type BotDifficulty = 'easy' | 'medium' | 'hard';

interface BotDifficultyOption {
  value: BotDifficulty;
  labelKey: string;
  color: string;
  bgTint: string;
  icon: string;
}

const BOT_DIFFICULTIES: BotDifficultyOption[] = [
  {
    value: 'easy',
    labelKey: 'bots.easy',
    color: 'bg-sky-400 text-neo-black border-neo-black',
    bgTint: 'bg-sky-400/20',
    icon: '🤖',
  },
  {
    value: 'medium',
    labelKey: 'bots.medium',
    color: 'bg-violet-400 text-neo-black border-neo-black',
    bgTint: 'bg-violet-400/20',
    icon: '⚙️',
  },
  {
    value: 'hard',
    labelKey: 'bots.hard',
    color: 'bg-fuchsia-500 text-white border-neo-black',
    bgTint: 'bg-fuchsia-500/20',
    icon: '💀',
  },
];

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

const BotControls: React.FC<BotControlsProps> = ({
  socket,
  gameCode,
  players = [] as BotControlsPlayer[],
  disabled = false,
  maxPlayers = 8,
}) => {
  const { t } = useLanguage();
  const [addingDifficulty, setAddingDifficulty] = useState<BotDifficulty | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState<string>('');
  const [isManualAddExpanded, setIsManualAddExpanded] = useState<boolean>(false);

  const bots = players.filter(p => p.isBot === true);
  const playerCount = players.length;
  const canAddMore = playerCount < maxPlayers;

  const {
    autoFillEnabled,
    toggleAutoFill,
  } = useAutoFillBots({
    socket,
    enabled: !disabled,
    maxPlayers,
    currentPlayerCount: playerCount,
  });

  void gameCode;

  useEffect(() => {
    if (!socket) return;

    const handleBotAdded = (data: { username?: string; difficulty?: string }): void => {
      setAddingDifficulty(null);
      setError(null);
      if (data?.username) {
        setAnnouncement(`${data.username} bot added`);
        setTimeout(() => setAnnouncement(''), 2000);
      }
    };

    const handleBotRemoved = (data: { success?: boolean; username?: string }): void => {
      if (!data.success) {
        setError(t('bots.removeError') || 'Failed to remove bot');
      } else if (data.username) {
        setAnnouncement(`${data.username} removed`);
        setTimeout(() => setAnnouncement(''), 2000);
      }
    };

    const handleError = (message: string | { message: string }): void => {
      setAddingDifficulty(null);
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

  const handleAddBot = useCallback((difficulty: BotDifficulty): void => {
    if (!socket || !canAddMore || addingDifficulty || disabled) return;

    setAddingDifficulty(difficulty);
    setError(null);
    socket.emit('addBot', { difficulty });

    setTimeout(() => setAddingDifficulty(null), 3000);
  }, [socket, canAddMore, addingDifficulty, disabled]);

  const getDifficultyConfig = (difficulty: BotDifficulty | undefined): BotDifficultyOption => {
    return BOT_DIFFICULTIES.find(d => d.value === difficulty) || BOT_DIFFICULTIES[1];
  };

  const handleToggleManualAdd = useCallback(() => {
    setIsManualAddExpanded(prev => !prev);
  }, []);

  return (
    <div className="space-y-3">
      {/* Screen reader announcements */}
      <div role="status" aria-live="polite" className="sr-only">
        {announcement}
      </div>

      {/* Header */}
      <div className="flex items-center gap-2">
        <FaRobot className="text-neo-cyan" aria-hidden="true" />
        <span className="text-sm font-bold uppercase text-neo-cream/90">
          {t('bots.title') || 'AI Bots'}
        </span>
        {bots.length > 0 && (
          <Badge className="bg-neo-cyan text-neo-black text-xs px-2 py-0.5 font-bold">
            {bots.length}
          </Badge>
        )}
      </div>

      {/* Error Message */}
      <AnimatePresence>
        {error && (
          <motion.div
            role="alert"
            aria-live="assertive"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="text-xs text-neo-red bg-neo-red/10 px-3 py-2 rounded-neo border-2 border-neo-red/30"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Auto-fill Card - Promoted to top */}
      <div className="bg-neo-purple/10 text-white border-2 border-neo-purple rounded-neo p-3 shadow-hard-sm">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <FaMagic className="text-neo-purple shrink-0" aria-hidden="true" />
            <div className="min-w-0">
              <label
                htmlFor="auto-fill-switch"
                className="text-sm font-bold text-neo-cream block cursor-pointer"
              >
                {t('bots.autoFill') || 'Auto-fill Room'}
              </label>
              <p className="text-xs text-neo-cream/60 truncate">
                {t('bots.autoFillDesc') || 'Fills empty slots with AI bots'}
              </p>
            </div>
          </div>
          <Switch
            id="auto-fill-switch"
            checked={autoFillEnabled}
            onCheckedChange={toggleAutoFill}
            disabled={disabled}
            aria-describedby="auto-fill-desc"
          />
        </div>
      </div>

      {/* Manual Add Section - Collapsible */}
      <div className="space-y-2">
        {/* Toggle Button */}
        <button
          type="button"
          onClick={handleToggleManualAdd}
          disabled={disabled}
          aria-expanded={isManualAddExpanded}
          aria-controls="manual-bot-section"
          className={cn(
            "w-full flex items-center justify-between px-3 py-2.5 rounded-neo",
            "bg-neo-cyan/10 hover:bg-neo-cyan/20 text-neo-cream",
            "border-2 border-neo-cyan/30 hover:border-neo-cyan/50",
            "transition-all duration-100 shadow-hard-sm hover:shadow-hard",
            "hover:translate-x-[-1px] hover:translate-y-[-1px]",
            "active:shadow-none active:translate-x-[1px] active:translate-y-[1px]",
            disabled && "opacity-50 cursor-not-allowed hover:shadow-hard-sm hover:translate-x-0 hover:translate-y-0"
          )}
        >
          <div className="flex items-center gap-2">
            <FaPlus className="text-neo-cyan" aria-hidden="true" />
            <span className="text-sm font-bold">
              {t('bots.addBotsManually') || 'Add Bots'}
            </span>
          </div>
          <motion.span
            animate={{ rotate: isManualAddExpanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <FaChevronDown className="text-neo-cyan" aria-hidden="true" />
          </motion.span>
        </button>

        {/* Collapsible Content */}
        <AnimatePresence initial={false}>
          {isManualAddExpanded && (
            <motion.div
              id="manual-bot-section"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{
                height: { duration: 0.3, ease: [0.04, 0.62, 0.23, 0.98] },
                opacity: { duration: 0.2, ease: 'easeInOut' }
              }}
              style={{ overflow: 'hidden' }}
            >
              <div className="space-y-2 pt-2">
                <p className="text-xs text-neo-cream/60">
                  {t('bots.selectDifficultyPrompt') || 'Select difficulty:'}
                </p>

                <div className="flex flex-wrap gap-2">
                  {BOT_DIFFICULTIES.map((diff) => {
                    const isAdding = addingDifficulty === diff.value;
                    const isDisabled = !canAddMore || isAdding || disabled || addingDifficulty !== null;

                    return (
                      <motion.button
                        key={diff.value}
                        type="button"
                        onClick={() => handleAddBot(diff.value)}
                        disabled={isDisabled}
                        whileTap={{ scale: 0.95 }}
                        aria-label={`Add ${diff.value} bot`}
                        className={cn(
                          "flex items-center gap-1.5 px-3 py-2 rounded-neo text-sm font-bold",
                          "border-2 border-neo-black transition-all duration-100",
                          "min-h-[44px]",
                          diff.color,
                          !isDisabled && "shadow-hard-sm hover:shadow-hard hover:translate-x-[-1px] hover:translate-y-[-1px]",
                          !isDisabled && "active:shadow-none active:translate-x-[1px] active:translate-y-[1px]",
                          isDisabled && "opacity-50 cursor-not-allowed shadow-none"
                        )}
                      >
                        <FaPlus size={10} aria-hidden="true" />
                        <span aria-hidden="true">{diff.icon}</span>
                        <span>{isAdding ? '...' : (t(diff.labelKey) || diff.value)}</span>
                      </motion.button>
                    );
                  })}
                </div>

                {!canAddMore && (
                  <p className="text-xs text-neo-cream/50">
                    {t('bots.roomFull') || 'Room is full'}
                  </p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Current Bots List */}
      {bots.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-neo-cream/60">
            {t('bots.currentBots') || 'Current bots:'}
          </p>
          <div className="flex flex-wrap gap-2">
            <AnimatePresence mode="popLayout">
              {bots.map((bot) => {
                const config = getDifficultyConfig(bot.botDifficulty);
                return (
                  <motion.div
                    key={bot.username}
                    layout
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className={cn(
                      "flex items-center gap-2 rounded-neo px-2.5 py-1.5",
                      "border-2 border-neo-black shadow-hard-sm",
                      config.bgTint
                    )}
                  >
                    <span
                      className="w-5 h-5 rounded-full flex items-center justify-center text-xs shrink-0 border border-neo-black/30"
                      style={{ backgroundColor: bot.avatar?.color || '#60a5fa' }}
                      aria-hidden="true"
                    >
                      {bot.avatar?.emoji ? bot.avatar.emoji : <FaRobot className="text-neo-cream text-[10px]" />}
                    </span>
                    <span className="text-xs text-neo-cream font-medium truncate max-w-[80px]">
                      {bot.username}
                    </span>
                    <Badge
                      className={cn(
                        "text-[10px] px-1.5 py-0 shrink-0 font-bold",
                        config.color
                      )}
                      aria-label={`${bot.botDifficulty || 'medium'} difficulty`}
                    >
                      {config.icon}
                    </Badge>
                    <motion.button
                      type="button"
                      onClick={() => handleRemoveBot(bot.username)}
                      disabled={disabled}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      aria-label={`Remove ${bot.username}`}
                      className={cn(
                        "w-5 h-5 flex items-center justify-center rounded-full",
                        "text-neo-red/70 hover:text-neo-red hover:bg-neo-red/20",
                        "transition-colors shrink-0",
                        disabled && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      <FaTimes size={10} aria-hidden="true" />
                    </motion.button>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Empty State */}
      {bots.length === 0 && !autoFillEnabled && (
        <div className="text-center py-2">
          <p className="text-sm text-neo-cream/50">
            {t('bots.emptyState') || 'No bots yet - add some to practice!'}
          </p>
        </div>
      )}
    </div>
  );
};

export default BotControls;
