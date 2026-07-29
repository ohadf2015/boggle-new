import React, { useState, useCallback, useEffect } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { Bot, X, Wand2 } from 'lucide-react';
import { Badge } from './ui/badge';
import { Switch } from './ui/switch';
import { cn } from '../lib/utils';
import { useLanguage } from '../contexts/LanguageContext';
import { useAutoFillBots } from '../hooks/useAutoFillBots';
import type { Socket } from 'socket.io-client';
import Avatar from '@/components/Avatar';
import { socketErrorMessage, isBotErrorCode } from '../utils/socketErrorMessage';

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
    color: 'bg-neo-lime text-neo-black border-neo-black',
    bgTint: 'bg-neo-lime/20',
    icon: '🌱',
  },
  {
    value: 'medium',
    labelKey: 'bots.medium',
    color: 'bg-amber-400 text-neo-black border-neo-black',
    bgTint: 'bg-amber-400/20',
    icon: '⚡',
  },
  {
    value: 'hard',
    labelKey: 'bots.hard',
    color: 'bg-neo-red text-white border-neo-black',
    bgTint: 'bg-neo-red/20',
    icon: '🔥',
  },
];

interface BotControlsPlayer {
  username: string;
  isBot?: boolean;
  botDifficulty?: BotDifficulty;
  avatar?: {
    emoji?: string;
    color?: string;
    customAvatar?: import('@/shared/types/customAvatar').CustomAvatarConfig;
  } | null;
}

interface BotControlsProps {
  socket: Socket | null;
  gameCode: string;
  players?: BotControlsPlayer[];
  disabled?: boolean;
  maxPlayers?: number;
  defaultCollapsed?: boolean;
}

const BotControls: React.FC<BotControlsProps> = ({
  socket,
  gameCode,
  players = [] as BotControlsPlayer[],
  disabled = false,
  maxPlayers = 8,
}) => {
  const { t } = useLanguage();
  const [error, setError] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState<string>('');
  const bots = players.filter(p => p.isBot === true);
  const playerCount = players.length;

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
      setError(null);
      if (data?.username) {
        setAnnouncement(`${data.username} bot added`);
        setTimeout(() => setAnnouncement(''), 2000);
      }
    };

    const handleBotRemoved = (data: { success?: boolean; username?: string }): void => {
      if (!data.success) {
        setError(t('bots.removeError'));
      } else if (data.username) {
        setAnnouncement(`${data.username} removed`);
        setTimeout(() => setAnnouncement(''), 2000);
      }
    };

    const handleError = (data: string | { code?: string; message?: string }): void => {
      if (!isBotErrorCode(data)) return;
      setError(socketErrorMessage(data, t));
      setTimeout(() => setError(null), 3000);
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

  const getDifficultyConfig = (difficulty: BotDifficulty | undefined): BotDifficultyOption => {
    return BOT_DIFFICULTIES.find(d => d.value === difficulty) || BOT_DIFFICULTIES[1];
  };

  return (
    <div className="bg-neo-navy-light text-neo-white p-4 rounded-xl border-3 border-neo-black shadow-hard relative overflow-hidden space-y-3">
      <div className="absolute inset-0 bg-linear-to-br from-neo-cyan/5 via-transparent to-neo-pink/5 pointer-events-none" />

      {/* Screen reader announcements */}
      <div role="status" aria-live="polite" className="sr-only">
        {announcement}
      </div>

      {/* Header - always visible */}
      <div className="relative flex items-center gap-2">
        <Bot className="text-neo-cyan" aria-hidden="true" />
        <span className="text-sm font-bold text-neo-white uppercase">{t('bots.title')}</span>
        {bots.length > 0 && (
          <Badge className="bg-neo-cyan text-neo-black text-xs px-2 py-0.5 font-bold">
            {bots.length}
          </Badge>
        )}
      </div>

      {/* Error Message */}
      <AnimatePresence>
        {error && (
          <m.div
            role="alert"
            aria-live="assertive"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="text-xs text-neo-red bg-neo-red/10 px-3 py-2 rounded-neo border-2 border-neo-red/30"
          >
            {error}
          </m.div>
        )}
      </AnimatePresence>

      {/* Auto-fill Card */}
      <div className="relative bg-neo-pink/10 text-white border-2 border-neo-pink rounded-neo p-3 shadow-hard-sm">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Wand2 className="text-neo-pink shrink-0" aria-hidden="true" />
            <div className="min-w-0">
              <label
                htmlFor="auto-fill-switch"
                className="text-sm font-bold text-neo-white block cursor-pointer"
              >
                {t('bots.autoFill')}
              </label>
              <p className="text-xs text-neo-white truncate">
                {t('bots.autoFillDesc')}
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

      {/* Current Bots List */}
      {bots.length > 0 && (
        <div className="relative space-y-2">
          <p className="text-xs text-neo-white">
            {t('bots.currentBots')}
          </p>
          <div className="flex flex-wrap gap-2">
            <AnimatePresence mode="popLayout">
              {bots.map((bot) => {
                const config = getDifficultyConfig(bot.botDifficulty);
                return (
                  <m.div
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
                    <Avatar customAvatar={bot.avatar?.customAvatar} userId={bot.username} size="sm" />
                    <span className="text-xs text-neo-white font-medium truncate max-w-[80px]">
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
                    <m.button
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
                      <X size={10} aria-hidden="true" />
                    </m.button>
                  </m.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      )}

    </div>
  );
};

export default BotControls;
