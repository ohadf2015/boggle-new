'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, HelpCircle, Zap, Trophy, Target, Keyboard, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAccessibility } from '@/contexts/AccessibilityContext';

interface HelpPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * HelpPanel - In-game help bottom sheet with quick reference for game rules
 * Neo-Brutalist design matching the Jackbox Party Pack theme
 */
export function HelpPanel({ isOpen, onClose }: HelpPanelProps) {
  const { t } = useLanguage();
  const { settings, toggleFireRoundLights } = useAccessibility();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[100] bg-black/50"
          />

          {/* Bottom Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.2}
            onDragEnd={(_, info) => {
              if (info.offset.y > 100) {
                onClose();
              }
            }}
            className="fixed inset-x-0 bottom-0 z-[101] bg-neo-cream text-neo-black border-t-4 border-neo-black rounded-t-[24px] shadow-hard-xl max-h-[75vh] landscape:max-h-[85vh] overflow-y-auto overscroll-contain"
            style={{ paddingBottom: 'env(safe-area-inset-bottom, 16px)' }}
          >
            {/* Drag Handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-12 h-1 bg-neo-black/30 text-white rounded-full" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-4 pb-3 border-b-2 border-neo-black/10">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-6 h-6 text-neo-pink" />
                <h2 className="text-xl font-black text-neo-black uppercase">
                  {t('help.title') || 'Quick Help'}
                </h2>
              </div>
              <button
                onClick={onClose}
                className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center bg-neo-cream border-2 border-neo-black rounded-neo shadow-hard-sm hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-hard transition-all"
                aria-label="Close"
              >
                <X className="w-5 h-5 text-neo-black" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4">
              {/* How to Play */}
              <section className="bg-neo-cyan/10 text-neo-black border-2 border-neo-cyan rounded-neo p-3">
                <h3 className="font-black text-neo-black uppercase flex items-center gap-2 mb-2">
                  <Target className="w-4 h-4" />
                  {t('help.howToPlay') || 'How to Play'}
                </h3>
                <ul className="list-disc list-inside text-sm text-neo-black/90 space-y-1">
                  <li>{t('help.swipeLetters') || 'Swipe adjacent letters to form words'}</li>
                  <li>{t('help.diagonalWorks') || 'Diagonal connections work too!'}</li>
                  <li>{t('help.liftToSubmit') || 'Lift finger to submit the word'}</li>
                  <li>{t('help.minThreeLetters') || 'Words must be at least 3 letters'}</li>
                </ul>
              </section>

              {/* Scoring */}
              <section className="bg-neo-yellow/20 text-neo-black border-2 border-neo-yellow rounded-neo p-3">
                <h3 className="font-black text-neo-black uppercase flex items-center gap-2 mb-2">
                  <Trophy className="w-4 h-4" />
                  {t('help.scoring') || 'Scoring'}
                </h3>
                <div className="text-sm text-neo-black/90 space-y-1">
                  <div className="flex justify-between">
                    <span>3 {t('help.letters') || 'letters'}</span>
                    <span className="font-bold">1 {t('help.point') || 'point'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>4 {t('help.letters') || 'letters'}</span>
                    <span className="font-bold">2 {t('help.points') || 'points'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>5 {t('help.letters') || 'letters'}</span>
                    <span className="font-bold">3 {t('help.points') || 'points'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>6 {t('help.letters') || 'letters'}</span>
                    <span className="font-bold">4 {t('help.points') || 'points'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>7+ {t('help.letters') || 'letters'}</span>
                    <span className="font-bold">5+ {t('help.points') || 'points'}</span>
                  </div>
                </div>
              </section>

              {/* Combos */}
              <section className="bg-neo-red/20 text-neo-black border-2 border-neo-red rounded-neo p-3">
                <h3 className="font-black text-neo-black uppercase flex items-center gap-2 mb-2">
                  <Zap className="w-4 h-4" />
                  {t('help.combos') || 'Combos'}
                </h3>
                <p className="text-sm text-neo-black/90">
                  {t('help.comboExplanation') || 'Find words quickly in a row to build combos! Each combo level adds bonus points to your words.'}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <span className="px-2 py-1 bg-neo-yellow text-neo-black text-xs font-bold rounded-neo border border-neo-black">
                    x2 = +1
                  </span>
                  <span className="px-2 py-1 bg-neo-red text-neo-cream text-xs font-bold rounded-neo border border-neo-black">
                    x3 = +2
                  </span>
                  <span className="px-2 py-1 bg-neo-pink text-neo-cream text-xs font-bold rounded-neo border border-neo-black">
                    x5+ = +3
                  </span>
                </div>
              </section>

              {/* Accessibility Settings */}
              <section className="bg-neo-gray/10 text-neo-black border-2 border-neo-gray/50 rounded-neo p-3">
                <h3 className="font-black text-neo-black uppercase flex items-center gap-2 mb-2">
                  <Eye className="w-4 h-4" />
                  {t('help.accessibility') || 'Accessibility'}
                </h3>
                <div className="space-y-2">
                  {/* Fire Round Lights Toggle */}
                  <label className="flex items-center justify-between cursor-pointer group">
                    <span className="text-sm text-neo-black/90 flex-1 pr-3">
                      {t('help.disableFireRoundLights') || 'Disable fire round lights'}
                    </span>
                    <button
                      role="switch"
                      aria-checked={settings.disableFireRoundLights}
                      onClick={toggleFireRoundLights}
                      className={cn(
                        "relative w-12 h-7 rounded-full border-2 border-neo-black transition-colors",
                        settings.disableFireRoundLights
                          ? "bg-neo-pink"
                          : "bg-neo-cream"
                      )}
                    >
                      <span
                        className={cn(
                          "absolute top-0.5 w-5 h-5 rounded-full bg-neo-cream border-2 border-neo-black shadow-hard-sm transition-all",
                          settings.disableFireRoundLights
                            ? "left-[calc(100%-1.5rem)]"
                            : "left-0.5"
                        )}
                      />
                    </button>
                  </label>
                  <p className="text-xs text-neo-black/60">
                    {t('help.disableFireRoundLightsDescription') || 'Turn off the flashing lights on grid cells during fire round'}
                  </p>
                </div>
              </section>

              {/* Keyboard Shortcuts - Desktop only */}
              <section className="bg-neo-pink/10 text-white border-2 border-neo-pink rounded-neo p-3 hidden sm:block">
                <h3 className="font-black text-neo-pink uppercase flex items-center gap-2 mb-2">
                  <Keyboard className="w-4 h-4" />
                  {t('help.keyboardShortcuts') || 'Keyboard Shortcuts'}
                </h3>
                <div className="text-sm text-neo-black/90 space-y-1">
                  <div className="flex justify-between">
                    <span>{t('help.arrowKeys') || 'Arrow Keys'}</span>
                    <kbd className="px-2 py-0.5 bg-neo-cream border border-neo-black rounded text-xs font-mono">
                      {t('help.navigate') || 'Navigate'}
                    </kbd>
                  </div>
                  <div className="flex justify-between">
                    <span>{t('help.spaceKey') || 'Space'}</span>
                    <kbd className="px-2 py-0.5 bg-neo-cream border border-neo-black rounded text-xs font-mono">
                      {t('help.selectLetter') || 'Select letter'}
                    </kbd>
                  </div>
                  <div className="flex justify-between">
                    <span>{t('help.enterKey') || 'Enter'}</span>
                    <kbd className="px-2 py-0.5 bg-neo-cream border border-neo-black rounded text-xs font-mono">
                      {t('help.submitWord') || 'Submit word'}
                    </kbd>
                  </div>
                  <div className="flex justify-between">
                    <span>{t('help.backspaceKey') || 'Backspace'}</span>
                    <kbd className="px-2 py-0.5 bg-neo-cream border border-neo-black rounded text-xs font-mono">
                      {t('help.undoLetter') || 'Undo letter'}
                    </kbd>
                  </div>
                  <div className="flex justify-between">
                    <span>{t('help.escKey') || 'Escape'}</span>
                    <kbd className="px-2 py-0.5 bg-neo-cream border border-neo-black rounded text-xs font-mono">
                      {t('help.clearSelection') || 'Clear selection'}
                    </kbd>
                  </div>
                </div>
              </section>

              {/* Tap to close hint on mobile */}
              <p className="text-center text-xs text-neo-black/90 sm:hidden">
                {t('help.swipeDownToClose') || 'Swipe down to close'}
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/**
 * HelpButton - Floating help button to trigger the help panel
 */
interface HelpButtonProps {
  onClick: () => void;
  className?: string;
}

export function HelpButton({ onClick, className }: HelpButtonProps) {
  return (
    <motion.button
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ delay: 0.5, type: 'spring', stiffness: 300 }}
      onClick={onClick}
      className={cn(
        "w-12 h-12 bg-neo-pink border-3 border-neo-black rounded-full shadow-hard-lg flex items-center justify-center",
        "hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-hard-xl",
        "active:translate-x-[1px] active:translate-y-[1px] active:shadow-hard-pressed",
        "transition-all",
        className
      )}
      aria-label="Show help"
    >
      <HelpCircle className="w-6 h-6 text-neo-cream" />
    </motion.button>
  );
}

export default HelpPanel;
