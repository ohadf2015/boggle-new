import React from 'react';
import { motion } from 'framer-motion';
import { FaGamepad, FaTrophy, FaMinus, FaPlus, FaLock } from 'react-icons/fa';
import { cn } from '../lib/utils';
import { useLanguage } from '../contexts/LanguageContext';

/**
 * Game Type Selector Component
 * Allows host to choose between Regular Game and Tournament mode
 * with animated cards and round selection for tournaments
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
        gradient: 'from-cyan-500/20 to-teal-500/20',
        border: 'border-cyan-500/50',
        borderSelected: 'border-cyan-400',
        shadow: 'shadow-[0_0_25px_rgba(6,182,212,0.5)]',
        shadowHover: 'hover:shadow-[0_0_15px_rgba(6,182,212,0.3)]',
        text: 'text-cyan-400',
        iconBg: 'bg-cyan-500/20',
      }
    },
    {
      id: 'tournament',
      icon: FaTrophy,
      titleKey: 'hostView.tournament',
      descKey: 'hostView.tournamentDesc',
      locked: true,
      colors: {
        gradient: 'from-amber-500/20 to-yellow-500/20',
        border: 'border-amber-500/50',
        borderSelected: 'border-amber-400',
        shadow: 'shadow-[0_0_25px_rgba(245,158,11,0.5)]',
        shadowHover: 'hover:shadow-[0_0_15px_rgba(245,158,11,0.3)]',
        text: 'text-amber-400',
        iconBg: 'bg-amber-500/20',
      }
    }
  ];

  return (
    <div className="space-y-4">
      {/* Title */}
      <h3 className="text-center text-lg font-semibold text-purple-600 dark:text-purple-300">
        {t('hostView.gameTypeSelector') || 'Choose Game Mode'}
      </h3>

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
              whileHover={isLocked ? {} : { scale: 1.02 }}
              whileTap={isLocked ? {} : { scale: 0.98 }}
              disabled={isLocked}
              className={cn(
                "relative p-4 rounded-xl border-2 transition-all duration-300",
                `bg-gradient-to-br ${type.colors.gradient}`,
                isLocked
                  ? `${type.colors.border} opacity-50 cursor-not-allowed`
                  : isSelected
                    ? `${type.colors.borderSelected} ${type.colors.shadow}`
                    : `${type.colors.border} ${type.colors.shadowHover} opacity-70 hover:opacity-100`
              )}
            >
              {/* Coming Soon badge for locked items */}
              {isLocked && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-2 -right-2 px-2 py-0.5 bg-gradient-to-r from-amber-500 to-yellow-500 rounded-full flex items-center justify-center gap-1 text-white text-[10px] font-bold shadow-lg"
                >
                  <FaLock className="text-[8px]" />
                  {t('hostView.comingSoon') || 'Coming Soon'}
                </motion.div>
              )}
              {/* Selection indicator */}
              {isSelected && !isLocked && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-lg"
                >
                  ✓
                </motion.div>
              )}

              {/* Icon with pulse animation for tournament */}
              <motion.div
                className={cn(
                  "w-12 h-12 mx-auto mb-2 rounded-full flex items-center justify-center",
                  type.colors.iconBg
                )}
                animate={type.id === 'tournament' && isSelected ? {
                  scale: [1, 1.1, 1],
                } : {}}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                <Icon className={cn("text-2xl", type.colors.text)} />
              </motion.div>

              {/* Title */}
              <h4 className={cn(
                "font-bold text-base mb-1",
                isSelected ? type.colors.text : "text-slate-600 dark:text-slate-300"
              )}>
                {t(type.titleKey) || type.id}
              </h4>

              {/* Description */}
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-tight">
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
          className="mt-3 p-3 rounded-xl bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border border-amber-500/30"
        >
          <label className="block text-sm font-medium text-amber-600 dark:text-amber-400 mb-2 text-center">
            {t('hostView.numberOfRounds') || 'Number of Rounds'}
          </label>
          <div className="flex items-center justify-center gap-4">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setTournamentRounds(Math.max(2, tournamentRounds - 1))}
              disabled={tournamentRounds <= 2}
              className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center transition-all",
                tournamentRounds <= 2
                  ? "bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed"
                  : "bg-amber-500/20 text-amber-500 hover:bg-amber-500/30"
              )}
            >
              <FaMinus />
            </motion.button>

            <motion.span
              key={tournamentRounds}
              initial={{ scale: 1.2 }}
              animate={{ scale: 1 }}
              className="text-3xl font-bold text-amber-500 w-12 text-center"
            >
              {tournamentRounds}
            </motion.span>

            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setTournamentRounds(Math.min(5, tournamentRounds + 1))}
              disabled={tournamentRounds >= 5}
              className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center transition-all",
                tournamentRounds >= 5
                  ? "bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed"
                  : "bg-amber-500/20 text-amber-500 hover:bg-amber-500/30"
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
