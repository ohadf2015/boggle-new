import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaRobot, FaPlus, FaTimes, FaChevronDown, FaChevronUp } from 'react-icons/fa';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import Avatar from './Avatar';
import { cn } from '../lib/utils';
import { useLanguage } from '../contexts/LanguageContext';

const BOT_DIFFICULTIES = [
  { value: 'easy', labelKey: 'bots.easy', color: 'bg-neo-lime', description: 'Finds simple words' },
  { value: 'medium', labelKey: 'bots.medium', color: 'bg-neo-yellow', description: 'Balanced difficulty' },
  { value: 'hard', labelKey: 'bots.hard', color: 'bg-neo-red text-white', description: 'Expert word finder' },
];

/**
 * Bot Controls Component
 * Allows host to add/remove AI bots to the game
 */
const BotControls = ({
  socket,
  gameCode,
  players = [],
  disabled = false,
  maxPlayers = 50,
}) => {
  const { t } = useLanguage();
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedDifficulty, setSelectedDifficulty] = useState('medium');
  const [isAdding, setIsAdding] = useState(false);

  // Get current bots from players list
  const bots = players.filter(p => p.isBot);
  const playerCount = players.length;
  const canAddMore = playerCount < maxPlayers;

  const handleAddBot = useCallback(() => {
    if (!socket || !canAddMore || isAdding || disabled) return;

    setIsAdding(true);
    socket.emit('addBot', { difficulty: selectedDifficulty });

    // Reset adding state after a short delay (success will update players list)
    setTimeout(() => setIsAdding(false), 1000);
  }, [socket, selectedDifficulty, canAddMore, isAdding, disabled]);

  const handleRemoveBot = useCallback((botUsername) => {
    if (!socket || disabled) return;
    socket.emit('removeBot', { botUsername });
  }, [socket, disabled]);

  const toggleExpanded = useCallback(() => {
    setIsExpanded(prev => !prev);
  }, []);

  return (
    <div className="space-y-3">
      {/* Toggle Button */}
      <button
        type="button"
        onClick={toggleExpanded}
        className="w-full flex items-center justify-between py-2 text-neo-cream/70 hover:text-neo-cream transition-colors duration-100"
      >
        <span className="text-sm font-bold uppercase flex items-center gap-2">
          <FaRobot className="text-neo-cyan" />
          {t('bots.title') || 'AI Bots'}
          {bots.length > 0 && (
            <Badge className="bg-neo-cyan text-neo-black text-xs px-2 py-0.5">
              {bots.length}
            </Badge>
          )}
        </span>
        {isExpanded ? <FaChevronUp /> : <FaChevronDown />}
      </button>

      {/* Expandable Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden space-y-4"
          >
            {/* Difficulty Selection */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-neo-cream/60">
                {t('bots.selectDifficulty') || 'Bot Difficulty'}
              </label>
              <div className="flex gap-2">
                {BOT_DIFFICULTIES.map((diff) => {
                  const isSelected = selectedDifficulty === diff.value;
                  return (
                    <motion.button
                      key={diff.value}
                      type="button"
                      onClick={() => setSelectedDifficulty(diff.value)}
                      whileHover={{ x: -1, y: -1 }}
                      whileTap={{ x: 2, y: 2 }}
                      className={cn(
                        "px-3 py-2 rounded-neo font-bold text-sm transition-all duration-100 border-2 border-neo-black flex-1",
                        isSelected
                          ? `${diff.color} shadow-none translate-x-[2px] translate-y-[2px]`
                          : "bg-neo-cream text-neo-black shadow-hard-sm hover:shadow-hard"
                      )}
                    >
                      {t(diff.labelKey) || diff.value}
                    </motion.button>
                  );
                })}
              </div>
              <p className="text-xs text-neo-cream/50">
                {BOT_DIFFICULTIES.find(d => d.value === selectedDifficulty)?.description}
              </p>
            </div>

            {/* Add Bot Button */}
            <Button
              onClick={handleAddBot}
              disabled={!canAddMore || isAdding || disabled}
              className="w-full bg-neo-cyan text-neo-black hover:bg-neo-cyan/90"
            >
              <FaPlus className="mr-2" />
              {isAdding ? (t('bots.adding') || 'Adding...') : (t('bots.addBot') || 'Add Bot')}
            </Button>

            {/* Current Bots List */}
            {bots.length > 0 && (
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-neo-cream/60">
                  {t('bots.currentBots') || 'Bots in Room'} ({bots.length})
                </label>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  <AnimatePresence>
                    {bots.map((bot) => (
                      <motion.div
                        key={bot.username}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="flex items-center justify-between bg-neo-black/30 rounded-neo px-3 py-2 border border-neo-black/50"
                      >
                        <div className="flex items-center gap-2">
                          <Avatar
                            avatarEmoji={bot.avatar?.emoji}
                            avatarColor={bot.avatar?.color}
                            size="sm"
                          />
                          <div>
                            <span className="text-sm font-bold text-neo-cream">
                              {bot.username}
                            </span>
                            <Badge className={cn(
                              "ml-2 text-xs px-1.5 py-0",
                              bot.botDifficulty === 'easy' ? 'bg-neo-lime text-neo-black' :
                              bot.botDifficulty === 'hard' ? 'bg-neo-red text-white' :
                              'bg-neo-yellow text-neo-black'
                            )}>
                              {bot.botDifficulty || 'medium'}
                            </Badge>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveBot(bot.username)}
                          disabled={disabled}
                          className="text-neo-red hover:text-neo-red/80 transition-colors p-1"
                          title={t('bots.remove') || 'Remove bot'}
                        >
                          <FaTimes size={14} />
                        </button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            )}

            {/* Help Text */}
            <p className="text-xs text-neo-cream/40 text-center">
              {t('bots.helpText') || 'Bots will automatically find and submit words during the game.'}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default BotControls;
