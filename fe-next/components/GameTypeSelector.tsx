import { useCallback, memo } from 'react';
import { motion } from 'framer-motion';
import { Gamepad2, Trophy, Minus, Plus, Lock } from 'lucide-react';
import { cn } from '../lib/utils';
import { useLanguage } from '../contexts/LanguageContext';

/**
 * Game type
 */
type GameType = 'regular' | 'tournament';

/**
 * GameTypeSelector Props
 */
interface GameTypeSelectorProps {
  gameType: GameType;
  setGameType: (type: GameType) => void;
  tournamentRounds: number;
  setTournamentRounds: (rounds: number) => void;
}

/**
 * Game Type Selector Component - Compact Horizontal Radio Buttons
 * Neo-Brutalist Style - Memoized to prevent unnecessary re-renders
 */
const GameTypeSelector = memo<GameTypeSelectorProps>(({
  gameType,
  setGameType,
  tournamentRounds,
  setTournamentRounds
}) => {
  const { t } = useLanguage();

  const handleSelectGameType = useCallback((typeId: GameType, isLocked?: boolean) => {
    if (!isLocked) setGameType(typeId);
  }, [setGameType]);

  const handleDecreaseRounds = useCallback(() => {
    setTournamentRounds(Math.max(2, tournamentRounds - 1));
  }, [setTournamentRounds, tournamentRounds]);

  const handleIncreaseRounds = useCallback(() => {
    setTournamentRounds(Math.min(5, tournamentRounds + 1));
  }, [setTournamentRounds, tournamentRounds]);

  const isRegularSelected = gameType === 'regular';
  const isTournamentLocked = true; // Tournament is coming soon

  return (
    <div className="space-y-2">
      {/* Title */}
      <label className="text-xs font-bold uppercase text-neo-cream">
        {t('hostView.gameTypeSelector') || 'Game Mode'}
      </label>

      {/* Horizontal Radio Buttons */}
      <div className="flex gap-2" role="radiogroup" aria-label={t('hostView.gameTypeSelector') || 'Game Mode'}>
        {/* Regular Game Button */}
        <motion.button
          type="button"
          role="radio"
          aria-checked={isRegularSelected}
          onClick={() => handleSelectGameType('regular')}
          whileHover={{ x: -1, y: -1 }}
          whileTap={{ x: 1, y: 1 }}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-neo border-3 border-neo-black transition-all duration-100 font-bold text-sm",
            isRegularSelected
              ? "bg-neo-cyan text-neo-black shadow-none translate-x-[2px] translate-y-[2px]"
              : "bg-neo-cream text-neo-black shadow-hard-sm hover:shadow-hard"
          )}
        >
          <Gamepad2 className="text-sm" aria-hidden="true" />
          {t('hostView.regularGame') || 'Regular'}
        </motion.button>

        {/* Tournament Button (Locked) */}
        <motion.button
          type="button"
          role="radio"
          aria-checked={!isRegularSelected && !isTournamentLocked}
          disabled={isTournamentLocked}
          onClick={() => handleSelectGameType('tournament', isTournamentLocked)}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-neo border-3 border-neo-black transition-all duration-100 font-bold text-sm",
            "bg-neo-gray/60 text-neo-cream/90 opacity-70 cursor-not-allowed"
          )}
        >
          <Trophy className="text-sm" aria-hidden="true" />
          {t('hostView.tournament') || 'Tournament'}
          <Lock className="text-xs" aria-hidden="true" />
        </motion.button>
      </div>

      {/* Tournament Rounds Selector - Only show when tournament is selected */}
      {gameType === 'tournament' && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="p-2 rounded-neo bg-neo-navy border-2 border-neo-cream/30"
        >
          <div className="flex items-center justify-center gap-3">
            <label className="text-xs font-bold uppercase text-neo-cream">
              {t('hostView.numberOfRounds') || 'Rounds'}
            </label>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleDecreaseRounds}
              disabled={tournamentRounds <= 2}
              aria-label={t('hostView.decreaseRounds') || 'Decrease rounds'}
              className={cn(
                "w-7 h-7 rounded-neo border-2 flex items-center justify-center transition-all font-black text-xs",
                tournamentRounds <= 2
                  ? "bg-neo-gray/50 text-neo-cream/90 border-neo-cream/30 cursor-not-allowed"
                  : "bg-neo-cream text-neo-black border-neo-black shadow-hard-sm hover:shadow-hard"
              )}
            >
              <Minus size={10} aria-hidden="true" />
            </motion.button>

            <span className="text-xl font-black text-neo-lime w-6 text-center">
              {tournamentRounds}
            </span>

            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleIncreaseRounds}
              disabled={tournamentRounds >= 5}
              aria-label={t('hostView.increaseRounds') || 'Increase rounds'}
              className={cn(
                "w-7 h-7 rounded-neo border-2 flex items-center justify-center transition-all font-black text-xs",
                tournamentRounds >= 5
                  ? "bg-neo-gray/50 text-neo-cream/90 border-neo-cream/30 cursor-not-allowed"
                  : "bg-neo-cream text-neo-black border-neo-black shadow-hard-sm hover:shadow-hard"
              )}
            >
              <Plus size={10} aria-hidden="true" />
            </motion.button>
          </div>
        </motion.div>
      )}
    </div>
  );
});

GameTypeSelector.displayName = 'GameTypeSelector';

export default GameTypeSelector;
