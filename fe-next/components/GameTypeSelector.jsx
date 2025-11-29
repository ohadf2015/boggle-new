import React from 'react';
import { motion } from 'framer-motion';
import { FaGamepad, FaTrophy, FaMinus, FaPlus, FaLock } from 'react-icons/fa';
import { cn } from '../lib/utils';
import { useLanguage } from '../contexts/LanguageContext';

/**
 * Game Type Selector Component - Neo-Brutalist Style
 * Allows host to choose between Regular Game and Tournament mode
 */
const GameTypeSelector = ({
  gameType,
  setGameType,
  tournamentRounds,
  setTournamentRounds
}) => {
  const { t } = useLanguage();

  const gameTypes = [
    {
      id: 'regular',
      icon: FaGamepad,
      titleKey: 'hostView.regularGame',
      descKey: 'hostView.regularGameDesc',
      colors: {
        bg: 'bg-neo-cyan',
        bgUnselected: 'bg-neo-cream',
        text: 'text-neo-black',
        icon: 'text-neo-black',
      }
    },
    {
      id: 'tournament',
      icon: FaTrophy,
      titleKey: 'hostView.tournament',
      descKey: 'hostView.tournamentDesc',
      locked: true,
      colors: {
        bg: 'bg-neo-yellow',
        bgUnselected: 'bg-neo-cream',
        text: 'text-neo-black',
        icon: 'text-neo-black',
      }
    }
  ];

  return (
    <div className="space-y-3">
      {/* Title */}
      <label className="text-sm font-bold uppercase text-neo-cream">
        {t('hostView.gameTypeSelector') || 'Game Mode'}
      </label>

      {/* Game Type Cards */}
      <div className="grid grid-cols-2 gap-3">
        {gameTypes.map((type) => {
          const isSelected = gameType === type.id;
          const isLocked = type.locked;
          const Icon = type.icon;

          return (
            <motion.button
              key={type.id}
              onClick={() => !isLocked && setGameType(type.id)}
              whileHover={isLocked ? {} : { x: -2, y: -2 }}
              whileTap={isLocked ? {} : { x: 2, y: 2 }}
              disabled={isLocked}
              className={cn(
                "relative p-4 rounded-neo border-3 border-neo-black transition-all duration-100",
                isLocked
                  ? "bg-neo-gray opacity-70 cursor-not-allowed"
                  : isSelected
                    ? `${type.colors.bg} shadow-none translate-x-[2px] translate-y-[2px]`
                    : `${type.colors.bgUnselected} shadow-hard-sm hover:shadow-hard`
              )}
            >
              {/* Coming Soon badge for locked items */}
              {isLocked && (
                <div className="absolute -top-2 -right-2 px-2 py-0.5 bg-neo-orange rounded-neo border-2 border-neo-black flex items-center justify-center gap-1 text-neo-black text-[10px] font-black shadow-hard-sm">
                  <FaLock className="text-[8px]" />
                  {t('hostView.comingSoon') || 'Soon'}
                </div>
              )}

              {/* Selection indicator */}
              {isSelected && !isLocked && (
                <motion.div
                  initial={{ scale: 0, rotate: -10 }}
                  animate={{ scale: 1, rotate: 0 }}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-neo-lime rounded-neo border-2 border-neo-black flex items-center justify-center text-neo-black text-xs font-black shadow-hard-sm"
                >
                  ✓
                </motion.div>
              )}

              {/* Icon */}
              <div className={cn(
                "w-10 h-10 mx-auto mb-2 rounded-neo border-2 border-neo-black flex items-center justify-center",
                isSelected ? "bg-neo-white" : "bg-neo-white/50"
              )}>
                <Icon className={cn("text-xl", type.colors.icon)} />
              </div>

              {/* Title */}
              <h4 className={cn(
                "font-black text-sm uppercase",
                isLocked ? "text-neo-cream" : type.colors.text
              )}>
                {t(type.titleKey) || type.id}
              </h4>

              {/* Description */}
              <p className={cn(
                "text-xs font-medium leading-tight mt-1",
                isLocked ? "text-neo-cream" : "text-neo-black"
              )}>
                {t(type.descKey) || ''}
              </p>
            </motion.button>
          );
        })}
      </div>

      {/* Tournament Rounds Selector - Only show when tournament is selected */}
      {gameType === 'tournament' && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="p-3 rounded-neo bg-neo-navy border-3 border-neo-cream/30 shadow-hard-sm"
        >
          <label className="block text-sm font-bold uppercase text-neo-cream mb-2 text-center">
            {t('hostView.numberOfRounds') || 'Rounds'}
          </label>
          <div className="flex items-center justify-center gap-4">
            <motion.button
              whileHover={{ x: -1, y: -1 }}
              whileTap={{ x: 1, y: 1 }}
              onClick={() => setTournamentRounds(Math.max(2, tournamentRounds - 1))}
              disabled={tournamentRounds <= 2}
              className={cn(
                "w-10 h-10 rounded-neo border-2 flex items-center justify-center transition-all font-black",
                tournamentRounds <= 2
                  ? "bg-neo-gray/50 text-neo-cream/60 border-neo-cream/30 cursor-not-allowed"
                  : "bg-neo-cream text-neo-black border-neo-black shadow-hard-sm hover:shadow-hard"
              )}
            >
              <FaMinus />
            </motion.button>

            <motion.span
              key={tournamentRounds}
              initial={{ scale: 1.3 }}
              animate={{ scale: 1 }}
              className="text-3xl font-black text-neo-yellow w-12 text-center"
            >
              {tournamentRounds}
            </motion.span>

            <motion.button
              whileHover={{ x: -1, y: -1 }}
              whileTap={{ x: 1, y: 1 }}
              onClick={() => setTournamentRounds(Math.min(5, tournamentRounds + 1))}
              disabled={tournamentRounds >= 5}
              className={cn(
                "w-10 h-10 rounded-neo border-2 flex items-center justify-center transition-all font-black",
                tournamentRounds >= 5
                  ? "bg-neo-gray/50 text-neo-cream/60 border-neo-cream/30 cursor-not-allowed"
                  : "bg-neo-cream text-neo-black border-neo-black shadow-hard-sm hover:shadow-hard"
              )}
            >
              <FaPlus />
            </motion.button>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default GameTypeSelector;
