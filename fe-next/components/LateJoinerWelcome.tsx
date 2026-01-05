import React from 'react';
import { motion } from 'framer-motion';
import { Clock, Trophy, Rocket } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { useLanguage } from '../contexts/LanguageContext';
import { formatTimeMMSS } from '@/shared/utils';

interface LateJoinerWelcomeProps {
  isOpen: boolean;
  onClose: () => void;
  timeRemaining: number;
  topPlayers: Array<{ username: string; score: number }>;
}

/**
 * LateJoinerWelcome - Welcome dialog for players joining mid-game
 * Shows game status and quick tips to get them started
 */
const LateJoinerWelcome: React.FC<LateJoinerWelcomeProps> = ({
  isOpen,
  onClose,
  timeRemaining,
  topPlayers,
}): React.ReactElement => {
  const { t, dir } = useLanguage();

  const tips = [
    { icon: Rocket, text: t('lateJoiner.quickTip1'), color: 'bg-neo-yellow' },
    { icon: Clock, text: t('lateJoiner.quickTip2'), color: 'bg-neo-pink' },
    { icon: Trophy, text: t('lateJoiner.quickTip3'), color: 'bg-neo-lime' },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent noDescription className="max-w-md" dir={dir}>
        <DialogHeader className="bg-neo-orange text-neo-black p-3 sm:p-4">
          <DialogTitle className="flex items-center justify-center gap-2 sm:gap-3 text-base sm:text-xl">
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 0.5, repeat: 2 }}
            >
              <Rocket className="text-2xl sm:text-3xl" />
            </motion.div>
            {t('lateJoiner.welcomeTitle')}
          </DialogTitle>
        </DialogHeader>

        <DialogBody className="space-y-3 sm:space-y-4 px-3 sm:px-6">
          {/* Welcome Message */}
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-neo-black text-center leading-relaxed text-sm sm:text-base"
          >
            {t('lateJoiner.welcomeMessage')}
          </motion.p>

          {/* Game Status */}
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            {/* Time Remaining */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-neo-yellow rounded-neo border-2 border-neo-black p-2 sm:p-3 shadow-hard-sm"
            >
              <div className="flex items-center gap-2 mb-1">
                <Clock className="text-neo-black" />
                <span className="text-xs sm:text-sm font-bold text-neo-black">
                  {t('lateJoiner.timeRemaining')}
                </span>
              </div>
              <div className="text-lg sm:text-2xl font-black text-neo-black">
                {formatTimeMMSS(timeRemaining)}
              </div>
            </motion.div>

            {/* Current Leaders */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-neo-pink rounded-neo border-2 border-neo-black p-2 sm:p-3 shadow-hard-sm"
            >
              <div className="flex items-center gap-2 mb-1">
                <Trophy className="text-neo-black" />
                <span className="text-xs sm:text-sm font-bold text-neo-black">
                  {t('lateJoiner.currentLeaders')}
                </span>
              </div>
              <div className="text-xs sm:text-sm space-y-0.5">
                {topPlayers.slice(0, 3).map((player, idx) => (
                  <div key={idx} className="flex justify-between text-neo-black">
                    <span className="truncate max-w-[80px]">{player.username}</span>
                    <span className="font-bold">{player.score}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Quick Tips */}
          <div className="space-y-2">
            {tips.map((tip, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + index * 0.1 }}
                className="flex items-center gap-2 sm:gap-3"
              >
                <div className={`w-8 h-8 sm:w-10 sm:h-10 ${tip.color} rounded-neo border-2 border-neo-black flex items-center justify-center shadow-hard-sm flex-shrink-0`}>
                  <tip.icon className="text-neo-black text-sm sm:text-base" />
                </div>
                <span className="text-xs sm:text-sm text-neo-black leading-tight">
                  {tip.text}
                </span>
              </motion.div>
            ))}
          </div>
        </DialogBody>

        <DialogFooter className="px-3 sm:px-6 pb-3 sm:pb-6">
          <Button
            onClick={onClose}
            className="bg-neo-lime w-full text-sm sm:text-base"
            variant="outline"
          >
            <Rocket className={`${dir === 'rtl' ? 'ml-2' : 'mr-2'}`} />
            {t('lateJoiner.gotIt')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default LateJoinerWelcome;
