import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FaGamepad, FaPlay, FaTimes, FaStar, FaFire, FaTrophy } from 'react-icons/fa';
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
  onShowTutorial: () => void;
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
  onShowTutorial,
}): React.ReactElement => {
  const { t, dir } = useLanguage();
  const [dontShowAgain, setDontShowAgain] = useState<boolean>(false);

  const handleShowTutorial = (): void => {
    if (dontShowAgain) {
      markTutorialSeen();
    }
    onShowTutorial();
  };

  const handleSkip = (): void => {
    markTutorialSeen();
    onClose();
  };

  const features: FeatureItem[] = [
    { icon: FaStar, label: t('howToPlay.steps.scoring.title'), color: 'bg-neo-yellow' },
    { icon: FaFire, label: t('howToPlay.steps.combo.title'), color: 'bg-neo-orange' },
    { icon: FaTrophy, label: t('howToPlay.steps.achievements.title'), color: 'bg-neo-pink' },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md" dir={dir}>
        <DialogHeader className="bg-neo-cyan p-3 sm:p-4">
          <DialogTitle className="flex items-center justify-center gap-2 sm:gap-3 text-base sm:text-xl">
            <motion.div
              animate={{ rotate: [0, -10, 10, -10, 0] }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <FaGamepad className="text-2xl sm:text-3xl" />
            </motion.div>
            {t('howToPlay.newPlayer.welcomeTitle')}
          </DialogTitle>
        </DialogHeader>

        <DialogBody className="space-y-3 sm:space-y-4 px-3 sm:px-6">
          {/* Welcome Animation - LexiClash logo always LTR */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-center"
          >
            {/* Force LTR for brand name */}
            <div className="flex justify-center gap-1 sm:gap-2 mb-3 sm:mb-4" dir="ltr">
              {['L', 'E', 'X', 'I'].map((letter, i) => (
                <motion.div
                  key={letter}
                  initial={{ y: -20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.1 * i + 0.3 }}
                  className="w-8 h-8 sm:w-10 sm:h-10 bg-neo-yellow rounded-neo border-2 border-neo-black flex items-center justify-center font-black text-lg sm:text-xl shadow-hard-sm"
                >
                  {letter}
                </motion.div>
              ))}
              {['C', 'L', 'A', 'S', 'H'].map((letter, i) => (
                <motion.div
                  key={`clash-${letter}`}
                  initial={{ y: -20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.1 * i + 0.7 }}
                  className="w-8 h-8 sm:w-10 sm:h-10 bg-neo-pink rounded-neo border-2 border-neo-black flex items-center justify-center font-black text-lg sm:text-xl shadow-hard-sm"
                >
                  {letter}
                </motion.div>
              ))}
            </div>
          </motion.div>

          <p className="text-neo-black text-center leading-relaxed text-sm sm:text-base">
            {t('howToPlay.newPlayer.welcomeMessage')}
          </p>

          {/* Feature Preview */}
          <div className="flex justify-center gap-2 sm:gap-3">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5 + index * 0.1 }}
                className="flex flex-col items-center"
              >
                <div className={`w-10 h-10 sm:w-12 sm:h-12 ${feature.color} rounded-neo border-2 border-neo-black flex items-center justify-center shadow-hard-sm`}>
                  <feature.icon className="text-neo-black text-lg sm:text-xl" />
                </div>
                <span className="text-[10px] sm:text-xs font-bold mt-1 text-neo-black/70 text-center max-w-[50px] sm:max-w-[60px]">
                  {feature.label}
                </span>
              </motion.div>
            ))}
          </div>

          {/* Don't show again checkbox */}
          <label className="flex items-center justify-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="w-4 h-4 rounded border-2 border-neo-black accent-neo-pink"
            />
            <span className="text-xs sm:text-sm text-neo-black/60">
              {t('howToPlay.newPlayer.dontShowAgain')}
            </span>
          </label>
        </DialogBody>

        <DialogFooter className="flex-col sm:flex-row gap-2 px-3 sm:px-6 pb-3 sm:pb-6">
          <Button
            variant="outline"
            onClick={handleSkip}
            className="bg-neo-cream flex-1 text-sm sm:text-base"
          >
            <FaTimes className={`${dir === 'rtl' ? 'ml-2' : 'mr-2'}`} />
            {t('howToPlay.newPlayer.skipTutorial')}
          </Button>
          <Button
            variant="outline"
            onClick={handleShowTutorial}
            className="bg-neo-lime flex-1 text-sm sm:text-base"
          >
            <FaPlay className={`${dir === 'rtl' ? 'ml-2' : 'mr-2'}`} />
            {t('howToPlay.newPlayer.showTutorial')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default NewPlayerWelcome;
