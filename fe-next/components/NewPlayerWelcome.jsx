import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaGamepad, FaQuestionCircle, FaPlay, FaTimes, FaCheck, FaStar, FaFire, FaTrophy } from 'react-icons/fa';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { useLanguage } from '../contexts/LanguageContext';

const STORAGE_KEY = 'lexiclash_tutorial_seen';

/**
 * Checks if this is the user's first visit
 * @returns {boolean}
 */
export const isFirstTimePlayer = () => {
  if (typeof window === 'undefined') return false;
  return !localStorage.getItem(STORAGE_KEY);
};

/**
 * Marks the tutorial as seen
 */
export const markTutorialSeen = () => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, 'true');
};

/**
 * NewPlayerWelcome - Welcome modal for first-time players
 * Shows a friendly welcome with option to view the tutorial
 */
const NewPlayerWelcome = ({ isOpen, onClose, onShowTutorial }) => {
  const { t, dir } = useLanguage();
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const handleShowTutorial = () => {
    if (dontShowAgain) {
      markTutorialSeen();
    }
    onShowTutorial();
  };

  const handleSkip = () => {
    markTutorialSeen();
    onClose();
  };

  const features = [
    { icon: FaStar, label: t('howToPlay.steps.scoring.title'), color: 'bg-neo-yellow' },
    { icon: FaFire, label: t('howToPlay.steps.combo.title'), color: 'bg-neo-orange' },
    { icon: FaTrophy, label: t('howToPlay.steps.achievements.title'), color: 'bg-neo-pink' },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md" dir={dir}>
        <DialogHeader className="bg-neo-cyan">
          <DialogTitle className="flex items-center justify-center gap-3">
            <motion.div
              animate={{ rotate: [0, -10, 10, -10, 0] }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <FaGamepad className="text-3xl" />
            </motion.div>
            {t('howToPlay.newPlayer.welcomeTitle')}
          </DialogTitle>
        </DialogHeader>

        <DialogBody className="space-y-4">
          {/* Welcome Animation */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-center"
          >
            <div className="flex justify-center gap-2 mb-4">
              {['L', 'E', 'X', 'I'].map((letter, i) => (
                <motion.div
                  key={letter}
                  initial={{ y: -20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.1 * i + 0.3 }}
                  className="w-10 h-10 bg-neo-yellow rounded-neo border-2 border-neo-black flex items-center justify-center font-black text-xl shadow-hard-sm"
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
                  className="w-10 h-10 bg-neo-pink rounded-neo border-2 border-neo-black flex items-center justify-center font-black text-xl shadow-hard-sm"
                >
                  {letter}
                </motion.div>
              ))}
            </div>
          </motion.div>

          <p className="text-neo-black text-center leading-relaxed">
            {t('howToPlay.newPlayer.welcomeMessage')}
          </p>

          {/* Feature Preview */}
          <div className="flex justify-center gap-3">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5 + index * 0.1 }}
                className="flex flex-col items-center"
              >
                <div className={`w-12 h-12 ${feature.color} rounded-neo border-2 border-neo-black flex items-center justify-center shadow-hard-sm`}>
                  <feature.icon className="text-neo-black text-xl" />
                </div>
                <span className="text-xs font-bold mt-1 text-neo-black/70 text-center max-w-[60px]">
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
            <span className="text-sm text-neo-black/60">
              {t('howToPlay.newPlayer.dontShowAgain')}
            </span>
          </label>
        </DialogBody>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="neo"
            onClick={handleSkip}
            className="bg-neo-cream flex-1"
          >
            <FaTimes className="mr-2" />
            {t('howToPlay.newPlayer.skipTutorial')}
          </Button>
          <Button
            variant="neo"
            onClick={handleShowTutorial}
            className="bg-neo-lime flex-1"
          >
            <FaPlay className="mr-2" />
            {t('howToPlay.newPlayer.showTutorial')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default NewPlayerWelcome;
