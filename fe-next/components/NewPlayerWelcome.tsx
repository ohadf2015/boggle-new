import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Gamepad2, Play, Star, Zap, Trophy } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { useLanguage } from '../contexts/LanguageContext';

const STORAGE_KEY = 'lexiclash_tutorial_seen';

/**
 * Checks if this is the user's first visit
 */
export const isFirstTimePlayer = (): boolean => {
  if (typeof window === 'undefined') return false;
  return !localStorage.getItem(STORAGE_KEY);
};

/**
 * Marks the tutorial as seen
 */
export const markTutorialSeen = (): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, 'true');
};

interface NewPlayerWelcomeProps {
  isOpen: boolean;
  onClose: () => void;
}

interface FeatureItem {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  color: string;
}

/**
 * NewPlayerWelcome - Welcome modal for first-time players
 * Shows a friendly welcome with option to view the tutorial
 */
const NewPlayerWelcome: React.FC<NewPlayerWelcomeProps> = ({
  isOpen,
  onClose,
}): React.ReactElement => {
  const { t, dir } = useLanguage();
  const [dontShowAgain, setDontShowAgain] = useState<boolean>(false);

  const handlePlay = (): void => {
    if (dontShowAgain) {
      markTutorialSeen();
    }
    onClose();
  };

  // Simplified 3-point quick intro
  const quickTips: FeatureItem[] = [
    { icon: Star, label: t('howToPlay.quickTip.findWords') || 'Find words in the grid', color: 'bg-neo-yellow' },
    { icon: Zap, label: t('howToPlay.quickTip.chainWords') || 'Chain words for combos', color: 'bg-neo-orange' },
    { icon: Trophy, label: t('howToPlay.quickTip.beatOpponents') || 'Beat your opponents!', color: 'bg-neo-pink' },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-sm" dir={dir}>
        <DialogHeader className="bg-neo-cyan text-neo-black p-2 sm:p-3">
          <DialogTitle className="flex items-center justify-center gap-2 text-base sm:text-lg">
            <Gamepad2 className="text-lg sm:text-xl" />
            {t('howToPlay.newPlayer.welcomeTitle') || 'Welcome!'}
          </DialogTitle>
        </DialogHeader>

        <DialogBody className="space-y-2 px-3 sm:px-4 py-2">
          {/* Quick 3-step intro - compact layout */}
          <div className="space-y-2">
            {quickTips.map((tip, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center gap-2"
              >
                <div className={`w-8 h-8 ${tip.color} rounded-lg border-2 border-neo-black flex items-center justify-center shadow-hard-sm flex-shrink-0`}>
                  <tip.icon className="w-4 h-4 text-neo-black" />
                </div>
                <span className="text-sm font-medium text-neo-black">
                  {tip.label}
                </span>
              </motion.div>
            ))}
          </div>

          {/* Don't show again */}
          <label className="flex items-center justify-center gap-2 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="w-4 h-4 rounded border-2 border-neo-black accent-neo-pink"
            />
            <span className="text-xs text-neo-black/70">
              {t('howToPlay.newPlayer.dontShowAgain') || "Don't show again"}
            </span>
          </label>
        </DialogBody>

        <DialogFooter className="px-3 sm:px-4 pb-3">
          <Button
            onClick={handlePlay}
            className="w-full bg-neo-lime hover:bg-neo-lime/90 text-neo-black font-bold border-3 border-neo-black shadow-hard py-2"
          >
            <Play className="w-4 h-4 me-2" />
            {t('howToPlay.newPlayer.letsPlay') || "Let's Play!"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default NewPlayerWelcome;
