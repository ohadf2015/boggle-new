'use client';

import React, { memo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Flame,
  Zap,
  Target,
  TrendingUp,
  Sparkles,
  Trophy,
  Star,
  Clock,
  BookOpen,
  Sword,
  Crown,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '../../../lib/utils';

export type NotificationTier = 'subtle' | 'medium' | 'mega';

export type TvNotificationType =
  | 'long_word'
  | 'epic_word'
  | 'rare_word'
  | 'combo_5x'
  | 'combo_10x'
  | 'combo_15x'
  | 'combo_20x'
  | 'combo_broken'
  | 'first_blood'
  | 'overtake'
  | 'comeback'
  | 'photo_finish'
  | 'word_snipe'
  | 'fire_round_start'
  | 'fire_round_end'
  | 'achievement'
  | 'level_up'
  | 'final_warning'
  | 'earthquake';

export interface TvNotificationData {
  id: string;
  type: TvNotificationType;
  tier: NotificationTier;
  player?: string;
  headline: string;
  subtext?: string;
  duration: number;
  timestamp: number;
}

interface TvNotificationProps {
  notification: TvNotificationData;
  onDismiss: (id: string) => void;
}

// Notification type configurations
const NOTIFICATION_CONFIGS: Record<TvNotificationType, {
  icon: React.ElementType;
  bgGradient: string;
  textColor: string;
  borderColor: string;
}> = {
  long_word: {
    icon: BookOpen,
    bgGradient: 'from-neo-cyan to-neo-blue',
    textColor: 'text-neo-black',
    borderColor: 'border-neo-black',
  },
  epic_word: {
    icon: Sparkles,
    bgGradient: 'from-neo-purple to-neo-pink',
    textColor: 'text-neo-cream',
    borderColor: 'border-neo-black',
  },
  rare_word: {
    icon: Star,
    bgGradient: 'from-yellow-400 via-amber-500 to-orange-500',
    textColor: 'text-neo-black',
    borderColor: 'border-neo-black',
  },
  combo_5x: {
    icon: Flame,
    bgGradient: 'from-neo-orange to-neo-yellow',
    textColor: 'text-neo-black',
    borderColor: 'border-neo-black',
  },
  combo_10x: {
    icon: Flame,
    bgGradient: 'from-neo-orange to-neo-red',
    textColor: 'text-neo-cream',
    borderColor: 'border-neo-black',
  },
  combo_15x: {
    icon: Flame,
    bgGradient: 'from-neo-red to-neo-pink',
    textColor: 'text-neo-cream',
    borderColor: 'border-neo-black',
  },
  combo_20x: {
    icon: Crown,
    bgGradient: 'from-neo-pink via-neo-purple to-neo-cyan',
    textColor: 'text-neo-cream',
    borderColor: 'border-neo-black',
  },
  combo_broken: {
    icon: AlertTriangle,
    bgGradient: 'from-gray-600 to-gray-800',
    textColor: 'text-neo-cream',
    borderColor: 'border-neo-black',
  },
  first_blood: {
    icon: Target,
    bgGradient: 'from-neo-red to-neo-orange',
    textColor: 'text-neo-cream',
    borderColor: 'border-neo-black',
  },
  overtake: {
    icon: TrendingUp,
    bgGradient: 'from-neo-lime to-neo-cyan',
    textColor: 'text-neo-black',
    borderColor: 'border-neo-black',
  },
  comeback: {
    icon: Zap,
    bgGradient: 'from-neo-yellow via-neo-orange to-neo-red',
    textColor: 'text-neo-black',
    borderColor: 'border-neo-black',
  },
  photo_finish: {
    icon: Sword,
    bgGradient: 'from-neo-purple to-neo-cyan',
    textColor: 'text-neo-cream',
    borderColor: 'border-neo-black',
  },
  word_snipe: {
    icon: Sword,
    bgGradient: 'from-neo-cyan to-neo-blue',
    textColor: 'text-neo-black',
    borderColor: 'border-neo-black',
  },
  fire_round_start: {
    icon: Flame,
    bgGradient: 'from-neo-orange via-neo-red to-neo-pink',
    textColor: 'text-neo-cream',
    borderColor: 'border-neo-black',
  },
  fire_round_end: {
    icon: Flame,
    bgGradient: 'from-gray-400 to-gray-600',
    textColor: 'text-neo-cream',
    borderColor: 'border-neo-black',
  },
  achievement: {
    icon: Trophy,
    bgGradient: 'from-neo-yellow to-neo-orange',
    textColor: 'text-neo-black',
    borderColor: 'border-neo-black',
  },
  level_up: {
    icon: Star,
    bgGradient: 'from-neo-purple to-neo-pink',
    textColor: 'text-neo-cream',
    borderColor: 'border-neo-black',
  },
  final_warning: {
    icon: Clock,
    bgGradient: 'from-neo-red to-neo-orange',
    textColor: 'text-neo-cream',
    borderColor: 'border-neo-black',
  },
  earthquake: {
    icon: AlertTriangle,
    bgGradient: 'from-neo-orange to-neo-red',
    textColor: 'text-neo-cream',
    borderColor: 'border-neo-black',
  },
};

// Animation variants by tier
const TIER_ANIMATIONS = {
  subtle: {
    initial: { opacity: 0, y: -20, scale: 0.95 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: -10, scale: 0.95 },
    transition: { type: 'spring' as const, stiffness: 300, damping: 25 },
  },
  medium: {
    initial: { opacity: 0, x: 100, scale: 0.8, rotate: 5 },
    animate: { opacity: 1, x: 0, scale: 1, rotate: 0 },
    exit: { opacity: 0, x: -50, scale: 0.9 },
    transition: { type: 'spring' as const, stiffness: 400, damping: 20 },
  },
  mega: {
    initial: { opacity: 0, scale: 0.5, rotate: -10 },
    animate: { opacity: 1, scale: 1, rotate: 0 },
    exit: { opacity: 0, scale: 1.1, rotate: 5 },
    transition: { type: 'spring' as const, stiffness: 500, damping: 15 },
  },
};

/**
 * TvNotification - Individual notification component with animation tiers
 */
const TvNotification = memo<TvNotificationProps>(({
  notification,
  onDismiss,
}) => {
  const config = NOTIFICATION_CONFIGS[notification.type];
  const animations = TIER_ANIMATIONS[notification.tier];
  const Icon = config.icon;

  // Auto-dismiss after duration
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(notification.id);
    }, notification.duration);

    return () => clearTimeout(timer);
  }, [notification.id, notification.duration, onDismiss]);

  const sizeClasses = {
    subtle: 'px-6 py-3 max-w-md',
    medium: 'px-8 py-4 max-w-lg',
    mega: 'px-10 py-6 max-w-xl',
  };

  const textClasses = {
    subtle: 'text-xl',
    medium: 'text-2xl',
    mega: 'text-3xl md:text-4xl',
  };

  const iconClasses = {
    subtle: 'w-6 h-6',
    medium: 'w-8 h-8',
    mega: 'w-10 h-10 md:w-12 md:h-12',
  };

  return (
    <motion.div
      initial={animations.initial}
      animate={animations.animate}
      exit={animations.exit}
      transition={animations.transition}
      className={cn(
        'relative rounded-neo border-4',
        `bg-gradient-to-r ${config.bgGradient}`,
        config.textColor,
        config.borderColor,
        sizeClasses[notification.tier],
        notification.tier === 'mega' && 'shadow-hard-xl',
        notification.tier === 'medium' && 'shadow-hard-lg',
        notification.tier === 'subtle' && 'shadow-hard',
      )}
    >
      {/* Mega tier: Background glow effect */}
      {notification.tier === 'mega' && (
        <motion.div
          className="absolute inset-0 rounded-neo"
          animate={{
            boxShadow: [
              '0 0 20px rgba(255,107,53,0.4)',
              '0 0 40px rgba(255,51,102,0.6)',
              '0 0 20px rgba(255,107,53,0.4)',
            ],
          }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
      )}

      <div className="relative flex items-center gap-4">
        {/* Icon */}
        <motion.div
          animate={notification.tier === 'mega' ? { rotate: [0, -10, 10, 0] } : {}}
          transition={{ duration: 0.5, repeat: notification.tier === 'mega' ? Infinity : 0, repeatDelay: 1 }}
        >
          <Icon className={iconClasses[notification.tier]} />
        </motion.div>

        {/* Content */}
        <div className="flex-1">
          <motion.h3
            className={cn('font-black uppercase tracking-wider', textClasses[notification.tier])}
            animate={notification.tier === 'mega' ? { scale: [1, 1.02, 1] } : {}}
            transition={{ duration: 0.5, repeat: notification.tier === 'mega' ? Infinity : 0 }}
          >
            {notification.headline}
          </motion.h3>
          {notification.subtext && (
            <p className={cn(
              'font-bold opacity-90',
              notification.tier === 'subtle' ? 'text-sm' : notification.tier === 'medium' ? 'text-base' : 'text-lg'
            )}>
              {notification.player && <span className="font-black">{notification.player}</span>}
              {notification.player && notification.subtext && ' - '}
              {notification.subtext}
            </p>
          )}
        </div>

        {/* Decorative sparkles for mega tier - positions deterministic based on index */}
        {notification.tier === 'mega' && (
          <>
            {[...Array(4)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-2 h-2 bg-neo-cream rounded-full"
                style={{
                  top: `${25 + (i * 15) % 55}%`,
                  left: `${15 + (i * 22) % 70}%`,
                }}
                animate={{
                  scale: [0, 1, 0],
                  opacity: [0, 1, 0],
                }}
                transition={{
                  duration: 1,
                  repeat: Infinity,
                  delay: i * 0.25,
                }}
              />
            ))}
          </>
        )}
      </div>
    </motion.div>
  );
});

TvNotification.displayName = 'TvNotification';

export default TvNotification;
