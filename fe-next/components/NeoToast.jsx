'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

/**
 * Neo-Brutalist Toast Component
 * Features: Thick borders, hard shadows, bold uppercase text, vibrant colors
 */

// Custom toast styles for Neo-Brutalist design
const neoToastStyles = {
  success: {
    background: 'var(--neo-lime)',
    color: 'var(--neo-black)',
    border: '3px solid var(--neo-black)',
    boxShadow: '4px 4px 0px var(--neo-black)',
  },
  error: {
    background: 'var(--neo-red)',
    color: 'var(--neo-white)',
    border: '3px solid var(--neo-black)',
    boxShadow: '4px 4px 0px var(--neo-black)',
  },
  info: {
    background: 'var(--neo-cyan)',
    color: 'var(--neo-black)',
    border: '3px solid var(--neo-black)',
    boxShadow: '4px 4px 0px var(--neo-black)',
  },
  warning: {
    background: 'var(--neo-yellow)',
    color: 'var(--neo-black)',
    border: '3px solid var(--neo-black)',
    boxShadow: '4px 4px 0px var(--neo-black)',
  },
};

// Neo-Brutalist Word Accepted Toast
export const wordAcceptedToast = (word, options = {}) => {
  const { score, comboBonus, comboLevel, duration } = options;

  return toast.custom(
    (t) => (
      <AnimatePresence>
        {t.visible && (
          <motion.div
            initial={{ y: -20, opacity: 0, scale: 0.9 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -10, opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className="flex items-center gap-3 px-4 py-3 rounded-lg bg-neo-lime border-3 border-neo-black shadow-hard"
            style={{ minWidth: '200px', pointerEvents: 'auto' }}
          >
            <motion.span
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.1, type: 'spring', stiffness: 300 }}
              className="text-2xl"
            >
              ✓
            </motion.span>
            <span className="font-black uppercase tracking-wide text-neo-black">
              {word}
            </span>
            {/* Show score if provided */}
            {typeof score === 'number' && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.15, type: 'spring', stiffness: 400, damping: 15 }}
                className="px-2 py-1 bg-neo-cyan border-2 border-neo-black rounded font-black text-sm text-neo-black"
              >
                +{score}
              </motion.span>
            )}
            {/* Show combo bonus if present */}
            {comboBonus > 0 && (
              <motion.span
                initial={{ scale: 0, rotate: -10 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.25, type: 'spring', stiffness: 400, damping: 15 }}
                className="px-2 py-1 bg-neo-orange border-2 border-neo-black rounded font-black text-sm text-neo-black"
              >
                +{comboBonus} {options.comboBonusLabel || 'combo!'}
              </motion.span>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    ),
    {
      duration: duration || 2000,
      position: 'top-center',
    }
  );
};

// Neo-Brutalist Word Needs Validation Toast
export const wordNeedsValidationToast = (word, options = {}) => {
  return toast.custom(
    (t) => (
      <AnimatePresence>
        {t.visible && (
          <motion.div
            initial={{ y: -20, opacity: 0, scale: 0.9 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -10, opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className="flex items-center gap-3 px-4 py-3 rounded-lg bg-neo-yellow border-3 border-neo-black shadow-hard"
            style={{ minWidth: '200px', pointerEvents: 'auto' }}
          >
            <motion.span
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 0.5, repeat: 2 }}
              className="text-2xl"
            >
              ⏳
            </motion.span>
            <span className="font-black uppercase tracking-wide text-neo-black">
              {word}
            </span>
            <span className="text-xs font-bold text-neo-black/70 uppercase">
              {options.pendingLabel || 'Pending'}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    ),
    {
      duration: options.duration || 2000,
      position: 'top-center',
    }
  );
};

// Neo-Brutalist Word Error Toast
export const wordErrorToast = (message, options = {}) => {
  return toast.custom(
    (t) => (
      <AnimatePresence>
        {t.visible && (
          <motion.div
            initial={{ y: -20, opacity: 0, scale: 0.9, x: 0 }}
            animate={{
              y: 0,
              opacity: 1,
              scale: 1,
              x: [0, -5, 5, -5, 5, 0]
            }}
            exit={{ y: -10, opacity: 0, scale: 0.95 }}
            transition={{
              type: 'spring',
              stiffness: 400,
              damping: 25,
              x: { duration: 0.4, delay: 0.1 }
            }}
            className="flex items-center gap-3 px-4 py-3 rounded-lg bg-neo-red border-3 border-neo-black shadow-hard"
            style={{ minWidth: '200px', pointerEvents: 'auto' }}
          >
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1, type: 'spring', stiffness: 400, damping: 15 }}
              className="text-2xl"
            >
              ✗
            </motion.span>
            <span className="font-black uppercase tracking-wide text-neo-white">
              {message}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    ),
    {
      duration: options.duration || 2500,
      position: 'top-center',
    }
  );
};

// Neo-Brutalist Success Toast (generic)
export const neoSuccessToast = (message, options = {}) => {
  return toast.custom(
    (t) => (
      <AnimatePresence>
        {t.visible && (
          <motion.div
            initial={{ y: -20, opacity: 0, scale: 0.9 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -10, opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className="flex items-center gap-3 px-4 py-3 rounded-lg bg-neo-lime border-3 border-neo-black shadow-hard"
            style={{ pointerEvents: 'auto' }}
          >
            {options.icon && (
              <motion.span
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.1, type: 'spring' }}
                className="text-2xl"
              >
                {options.icon}
              </motion.span>
            )}
            <span className="font-black uppercase tracking-wide text-neo-black">
              {message}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    ),
    {
      id: options.id, // Unique ID to prevent duplicate toasts
      duration: options.duration || 3000,
      position: 'top-center',
    }
  );
};

// Neo-Brutalist Error Toast (generic)
export const neoErrorToast = (message, options = {}) => {
  return toast.custom(
    (t) => (
      <AnimatePresence>
        {t.visible && (
          <motion.div
            initial={{ y: -20, opacity: 0, scale: 0.9, x: 0 }}
            animate={{
              y: 0,
              opacity: 1,
              scale: 1,
              x: [0, -3, 3, -3, 3, 0]
            }}
            exit={{ y: -10, opacity: 0, scale: 0.95 }}
            transition={{
              type: 'spring',
              stiffness: 400,
              damping: 25,
              x: { duration: 0.3 }
            }}
            className="flex items-center gap-3 px-4 py-3 rounded-lg bg-neo-red border-3 border-neo-black shadow-hard"
            style={{ pointerEvents: 'auto' }}
          >
            {options.icon && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1, type: 'spring', stiffness: 400, damping: 15 }}
                className="text-2xl"
              >
                {options.icon}
              </motion.span>
            )}
            <span className="font-black uppercase tracking-wide text-neo-white">
              {message}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    ),
    {
      duration: options.duration || 3000,
      position: 'top-center',
    }
  );
};

// Neo-Brutalist Level Up Toast
export const levelUpToast = (oldLevel, newLevel, options = {}) => {
  return toast.custom(
    (t) => (
      <AnimatePresence>
        {t.visible && (
          <motion.div
            initial={{ y: -50, opacity: 0, scale: 0.5, rotate: -10 }}
            animate={{
              y: 0,
              opacity: 1,
              scale: 1,
              rotate: 0,
            }}
            exit={{ y: -30, opacity: 0, scale: 0.8 }}
            transition={{
              type: 'spring',
              stiffness: 300,
              damping: 20
            }}
            className="flex flex-col items-center gap-2 px-6 py-4 rounded-neo bg-gradient-to-br from-neo-yellow via-neo-orange to-neo-pink border-4 border-neo-black shadow-hard-lg"
            style={{ minWidth: '220px', pointerEvents: 'auto' }}
          >
            <motion.div
              animate={{
                scale: [1, 1.3, 1],
                rotate: [0, 10, -10, 0]
              }}
              transition={{
                duration: 0.6,
                repeat: 2,
                ease: "easeInOut"
              }}
              className="text-4xl"
            >
              🎉
            </motion.div>
            <span className="font-black uppercase tracking-wide text-neo-black text-lg">
              {options.title || 'Level Up!'}
            </span>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 400 }}
              className="flex items-center gap-2 bg-neo-black text-neo-cream px-4 py-2 rounded-neo font-black text-xl"
            >
              <span>{oldLevel}</span>
              <motion.span
                animate={{ x: [0, 5, 0] }}
                transition={{ duration: 0.5, repeat: Infinity }}
              >
                →
              </motion.span>
              <span className="text-neo-yellow">{newLevel}</span>
            </motion.div>
            {options.newTitle && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-xs font-bold text-neo-black/80 bg-neo-cream/50 px-2 py-1 rounded-neo border border-neo-black"
              >
                🏅 {options.newTitleLabel || 'New Title'}: {options.newTitle}
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    ),
    {
      duration: options.duration || 4000,
      position: 'top-center',
    }
  );
};

// Neo-Brutalist XP Gained Toast
export const xpGainedToast = (xpAmount, options = {}) => {
  return toast.custom(
    (t) => (
      <AnimatePresence>
        {t.visible && (
          <motion.div
            initial={{ y: -20, opacity: 0, scale: 0.9 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -10, opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className="flex items-center gap-3 px-4 py-3 rounded-neo bg-gradient-to-r from-neo-purple to-neo-pink border-3 border-neo-black shadow-hard"
            style={{ minWidth: '180px', pointerEvents: 'auto' }}
          >
            <motion.span
              animate={{ rotate: [0, 20, -20, 0], scale: [1, 1.2, 1] }}
              transition={{ duration: 0.5, repeat: 1 }}
              className="text-2xl"
            >
              ⭐
            </motion.span>
            <span className="font-black uppercase tracking-wide text-neo-cream">
              +{xpAmount} XP
            </span>
            {options.breakdown && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-xs text-neo-cream/80"
              >
                {options.breakdown}
              </motion.span>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    ),
    {
      duration: options.duration || 3000,
      position: 'top-center',
    }
  );
};

// Neo-Brutalist Info Toast
export const neoInfoToast = (message, options = {}) => {
  return toast.custom(
    (t) => (
      <AnimatePresence>
        {t.visible && (
          <motion.div
            initial={{ y: -20, opacity: 0, scale: 0.9 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -10, opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className="flex items-center gap-3 px-4 py-3 rounded-lg bg-neo-cyan border-3 border-neo-black shadow-hard"
            style={{ pointerEvents: 'auto' }}
          >
            {options.icon && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1, type: 'spring' }}
                className="text-2xl"
              >
                {options.icon}
              </motion.span>
            )}
            <span className="font-black uppercase tracking-wide text-neo-black">
              {message}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    ),
    {
      duration: options.duration || 3000,
      position: 'top-center',
    }
  );
};

const NeoToast = {
  wordAccepted: wordAcceptedToast,
  wordNeedsValidation: wordNeedsValidationToast,
  wordError: wordErrorToast,
  success: neoSuccessToast,
  error: neoErrorToast,
  info: neoInfoToast,
  levelUp: levelUpToast,
  xpGained: xpGainedToast,
};

export default NeoToast;
