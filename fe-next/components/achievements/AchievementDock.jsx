'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../../contexts/LanguageContext';
import { cn } from '../../lib/utils';

const AchievementDock = ({ achievements = [], className }) => {
  const { t, dir } = useLanguage();
  const [isExpanded, setIsExpanded] = useState(false);
  const [hasNewAchievement, setHasNewAchievement] = useState(false);
  const prevCountRef = useRef(achievements.length);
  const autoCollapseTimeoutRef = useRef(null);

  // Detect new achievement added
  useEffect(() => {
    if (achievements.length > prevCountRef.current) {
      setHasNewAchievement(true);
      // Brief expand to show new achievement
      setIsExpanded(true);

      // Clear any existing timeout
      if (autoCollapseTimeoutRef.current) {
        clearTimeout(autoCollapseTimeoutRef.current);
      }

      // Auto-collapse after 5 seconds
      autoCollapseTimeoutRef.current = setTimeout(() => {
        setIsExpanded(false);
        setHasNewAchievement(false);
      }, 5000);
    }
    prevCountRef.current = achievements.length;

    return () => {
      if (autoCollapseTimeoutRef.current) {
        clearTimeout(autoCollapseTimeoutRef.current);
      }
    };
  }, [achievements.length]);

  const handleToggle = () => {
    setIsExpanded(!isExpanded);
    setHasNewAchievement(false);

    // Clear auto-collapse when user manually toggles
    if (autoCollapseTimeoutRef.current) {
      clearTimeout(autoCollapseTimeoutRef.current);
    }
  };

  if (achievements.length === 0) return null;

  return (
    <div className={cn('relative z-40', className)}>
      {/* Trophy Button */}
      <motion.button
        onClick={handleToggle}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        animate={hasNewAchievement ? {
          scale: [1, 1.2, 1],
          rotate: [0, 10, -10, 0],
        } : {}}
        transition={{ duration: 0.5 }}
        className={cn(
          'relative w-12 h-12 rounded-full flex items-center justify-center',
          'bg-gradient-to-br from-amber-400 to-orange-500',
          'shadow-lg shadow-amber-500/30',
          'border-2 border-amber-300/50',
          'hover:shadow-amber-500/50 transition-shadow',
          'cursor-pointer'
        )}
      >
        <span className="text-2xl">🏆</span>

        {/* Count badge */}
        <motion.span
          key={achievements.length}
          initial={{ scale: 1.5 }}
          animate={{ scale: 1 }}
          className={cn(
            'absolute -top-1 -right-1',
            'w-6 h-6 rounded-full',
            'bg-gradient-to-br from-purple-500 to-pink-500',
            'text-white text-xs font-bold',
            'flex items-center justify-center',
            'border-2 border-white shadow-md'
          )}
        >
          {achievements.length}
        </motion.span>

        {/* Pulse ring for new achievement */}
        {hasNewAchievement && (
          <motion.span
            className="absolute inset-0 rounded-full bg-amber-400"
            initial={{ scale: 1, opacity: 0.8 }}
            animate={{ scale: 2, opacity: 0 }}
            transition={{ duration: 1, repeat: Infinity }}
          />
        )}
      </motion.button>

      {/* Expanded Panel */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -10 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className={cn(
              'absolute top-full mt-2',
              dir === 'rtl' ? 'left-0' : 'right-0',
              'w-72 max-h-80 overflow-y-auto',
              'bg-white/95 dark:bg-slate-800/95 backdrop-blur-md',
              'rounded-xl shadow-xl',
              'border border-amber-500/30 dark:border-amber-400/20',
              'p-4'
            )}
          >
            {/* Header */}
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-200 dark:border-slate-700">
              <span className="text-xl">🏆</span>
              <h3 className="font-bold text-slate-800 dark:text-white">
                {t('achievementDock.title') || 'Your Achievements'}
              </h3>
            </div>

            {/* Achievement list */}
            <div className="space-y-2">
              {achievements.map((achievement, index) => (
                <motion.div
                  key={`${achievement.name}-${index}`}
                  initial={index === achievements.length - 1 && hasNewAchievement ? {
                    x: 20,
                    opacity: 0,
                    backgroundColor: 'rgba(6, 182, 212, 0.3)',
                  } : false}
                  animate={{
                    x: 0,
                    opacity: 1,
                    backgroundColor: 'transparent',
                  }}
                  transition={{ duration: 0.5 }}
                  className={cn(
                    'flex items-center gap-3 p-2 rounded-lg',
                    'hover:bg-amber-50 dark:hover:bg-amber-900/20',
                    'transition-colors cursor-pointer'
                  )}
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400 to-purple-500 flex items-center justify-center shadow-md flex-shrink-0">
                    <span className="text-lg">{achievement.icon}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-slate-800 dark:text-white truncate">
                      {achievement.name}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      {achievement.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AchievementDock;
