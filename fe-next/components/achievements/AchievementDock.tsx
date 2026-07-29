'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { m, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../../contexts/LanguageContext';
import { cn } from '../../lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import type { AchievementPayload } from '@/shared/types/socket';

interface LocalizedAchievement {
  icon: string;
  name: string;
  description: string;
}

interface LegacyAchievement {
  icon: string;
  name: string;
  description: string;
}

type Achievement = AchievementPayload | LegacyAchievement;

interface AchievementDockProps {
  achievements?: Achievement[];
  className?: string;
}

const EMPTY_ACHIEVEMENTS: Achievement[] = [];

/**
 * Neo-Brutalist Achievement Dock
 * Features: Thick borders, hard shadows, bold uppercase text, vibrant colors
 */
const AchievementDock = ({ achievements = EMPTY_ACHIEVEMENTS, className }: AchievementDockProps): React.ReactElement | null => {
  const { t, dir } = useLanguage();

  // Localize achievements using player's language
  // Achievement can have either { key, icon } (unlocalized) or { name, description, icon } (legacy localized)
  const localizedAchievements = useMemo(() => {
    return achievements.map((achievement): LocalizedAchievement => {
      if ('key' in achievement) {
        return {
          icon: achievement.icon,
          name: t(`achievements.${achievement.key}.name`) || achievement.key,
          description: t(`achievements.${achievement.key}.description`)
        };
      }
      // Legacy format: already has name and description
      return achievement;
    });
  }, [achievements, t]);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [hasNewAchievement, setHasNewAchievement] = useState<boolean>(false);
  const [panelPosition, setPanelPosition] = useState<{ top: number; left: number; right: number } | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const prevCountRef = useRef<number>(achievements.length);
  const autoCollapseTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Track client-side mounting for Portal
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Calculate panel position when expanded
  const updatePanelPosition = useCallback(() => {
    if (buttonRef.current && isExpanded) {
      const rect = buttonRef.current.getBoundingClientRect();
      const panelWidth = 320; // w-80 = 20rem = 320px

      // Position panel below the button
      const top = rect.bottom + 12; // mt-3 = 12px

      // Always anchor panel's right edge to button's right edge
      // (button is positioned at right-4, so it's always on the right side of the screen)
      const right = window.innerWidth - rect.right;
      setPanelPosition({ top, left: 0, right });
    }
  }, [isExpanded]);

  // Update position when expanded state or direction changes
  useEffect(() => {
    if (isExpanded) {
      updatePanelPosition();

      // Also update on resize/scroll
      const handleUpdate = () => updatePanelPosition();
      window.addEventListener('resize', handleUpdate);
      window.addEventListener('scroll', handleUpdate, true);

      return () => {
        window.removeEventListener('resize', handleUpdate);
        window.removeEventListener('scroll', handleUpdate, true);
      };
    }
    return undefined;
  }, [isExpanded, updatePanelPosition]);

  // Detect new achievement added
  useEffect(() => {
    if (achievements.length > prevCountRef.current) {
      // Clear any existing timeout
      if (autoCollapseTimeoutRef.current) {
        clearTimeout(autoCollapseTimeoutRef.current);
      }

      // Schedule state updates asynchronously to avoid synchronous setState in effect
      const showTimeoutId = setTimeout(() => {
        setHasNewAchievement(true);
        setIsExpanded(true);
      }, 0);

      // Auto-collapse after 5 seconds
      autoCollapseTimeoutRef.current = setTimeout(() => {
        setIsExpanded(false);
        setHasNewAchievement(false);
      }, 5000);

      prevCountRef.current = achievements.length;

      return () => {
        clearTimeout(showTimeoutId);
        if (autoCollapseTimeoutRef.current) {
          clearTimeout(autoCollapseTimeoutRef.current);
        }
      };
    }
    prevCountRef.current = achievements.length;
    return undefined;
  }, [achievements.length]);

  const handleToggle = (): void => {
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
      {/* Trophy Button - Neo-Brutalist */}
      <m.button
        ref={buttonRef}
        onClick={handleToggle}
        whileHover={{ scale: 1.05, rotate: 3 }}
        whileTap={{ scale: 0.95 }}
        animate={hasNewAchievement ? {
          scale: [1, 1.15, 1],
          rotate: [0, 5, -5, 0],
        } : {}}
        transition={{ duration: 0.4, ease: 'easeInOut' }}
        className={cn(
          'relative w-14 h-14 rounded-lg flex items-center justify-center',
          'bg-neo-lime border-3 border-neo-black',
          'shadow-hard',
          'hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-hard-lg',
          'active:translate-x-[2px] active:translate-y-[2px] active:shadow-hard-pressed',
          'cursor-pointer transition-all duration-100'
        )}
      >
        <span className="text-2xl">🏆</span>

        {/* Count badge - Neo-Brutalist */}
        <m.span
          key={achievements.length}
          initial={{ scale: 1.5 }}
          animate={{ scale: 1 }}
          className={cn(
            'absolute -top-2 -right-2 rtl:-right-auto rtl:-left-2',
            'w-7 h-7 rounded-md',
            'bg-neo-pink border-3 border-neo-black',
            'text-neo-white text-xs font-black',
            'flex items-center justify-center',
            'shadow-hard-sm'
          )}
        >
          {achievements.length}
        </m.span>

        {/* Pulse ring for new achievement - single pulse, not infinite */}
        {hasNewAchievement && (
          <m.span
            className="absolute inset-0 rounded-lg bg-neo-lime border-4 border-neo-black"
            initial={{ scale: 1, opacity: 0.8 }}
            animate={{ scale: 1.5, opacity: 0 }}
            transition={{ duration: 0.8 }}
          />
        )}
      </m.button>

      {/* Expanded Panel - Neo-Brutalist (rendered via Portal to escape overflow containers) */}
      {isMounted && createPortal(
        <AnimatePresence>
          {isExpanded && panelPosition && (
            <m.div
              initial={{ opacity: 0, scale: 0.9, y: -10, rotate: -2 }}
              animate={{ opacity: 1, scale: 1, y: 0, rotate: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -10 }}
              transition={{ type: 'spring', damping: 20, stiffness: 300 }}
              style={{
                position: 'fixed',
                top: panelPosition.top,
                right: panelPosition.right,
                zIndex: 9999,
              }}
              className={cn(
                'w-80 max-h-80 overflow-y-auto',
                'bg-neo-cream border-4 border-neo-black',
                'rounded-lg shadow-hard-lg',
                'p-0'
              )}
            >
              {/* Header - Neo-Brutalist stripe */}
              <div className="bg-neo-pink text-white border-b-4 border-neo-black px-4 py-3 flex items-center gap-2 rounded-t-lg">
                <span className="text-xl">🏆</span>
                <h3 className="font-black uppercase text-neo-white tracking-wide">
                  {t('achievementDock.title')}
                </h3>
              </div>

              {/* Achievement list */}
              <div className="p-3 space-y-2">
                <TooltipProvider delayDuration={0}>
                  {localizedAchievements.map((achievement, index) => (
                    <Tooltip key={`${achievement.name}-${index}`}>
                      <TooltipTrigger asChild>
                        <m.div
                          initial={index === localizedAchievements.length - 1 && hasNewAchievement ? {
                            x: 20,
                            opacity: 0,
                          } : false}
                          animate={{
                            x: 0,
                            opacity: 1,
                          }}
                          transition={{ duration: 0.3 }}
                          className={cn(
                            'flex items-center gap-3 p-3 rounded-md',
                            'bg-neo-white border-3 border-neo-black',
                            'shadow-hard-sm',
                            'hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-hard',
                            'transition-all duration-100 cursor-pointer'
                          )}
                        >
                          <div className="w-10 h-10 rounded-md bg-neo-cyan text-neo-black border-2 border-neo-black flex items-center justify-center shadow-hard-sm shrink-0">
                            <span className="text-lg">{achievement.icon}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-black text-sm text-neo-black uppercase truncate tracking-wide">
                              {achievement.name}
                            </p>
                            <p className="text-xs font-bold text-neo-black/70 truncate">
                              {achievement.description}
                            </p>
                          </div>
                        </m.div>
                      </TooltipTrigger>
                      <TooltipContent
                        side="left"
                        className="bg-neo-pink text-neo-white border-3 border-neo-black shadow-hard p-3 max-w-[200px]"
                      >
                        <p className="font-black text-sm uppercase">{achievement.name}</p>
                        <p className="text-xs mt-1">{achievement.description}</p>
                      </TooltipContent>
                    </Tooltip>
                  ))}
                </TooltipProvider>
              </div>
            </m.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
};

export default AchievementDock;
