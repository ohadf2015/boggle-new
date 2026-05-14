'use client';

import { memo, useEffect } from 'react';
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
  type LucideIcon,
} from 'lucide-react';
import Image from 'next/image';
import { m } from 'framer-motion';
import type { MascotVariant } from '../../../components/ui/Mascot';

// Hype banner images for specific notification types
const HYPE_BANNER_IMAGES: Partial<Record<TvNotificationType, string>> = {
  overtake: '/images/tv-broadcast/hype-overtake-banner.png',
  comeback: '/images/tv-broadcast/hype-comeback-banner.png',
  first_blood: '/images/tv-broadcast/hype-first-blood.png',
};
import {
  MascotBubbleLayout,
  ExplosiveBurstLayout,
  FullWidthBannerLayout,
  MinimalToastLayout,
} from './notifications';

export type NotificationTier = 'subtle' | 'medium' | 'mega';

export type NotificationLayout = 'mascot' | 'burst' | 'toast' | 'banner';

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

// Layout assignment by notification type
export const NOTIFICATION_LAYOUTS: Record<TvNotificationType, NotificationLayout> = {
  // Mascot Bubble - player achievements, combos
  long_word: 'mascot',
  epic_word: 'mascot',
  combo_5x: 'mascot',
  combo_10x: 'mascot',
  overtake: 'mascot',
  level_up: 'mascot',
  achievement: 'mascot',

  // Explosive Burst - mega events
  rare_word: 'burst',
  combo_15x: 'burst',
  combo_20x: 'burst',
  comeback: 'burst',
  first_blood: 'burst',
  photo_finish: 'burst',

  // Full-Width Banner - game state announcements
  fire_round_start: 'banner',
  fire_round_end: 'banner',
  final_warning: 'banner',
  earthquake: 'banner',

  // Minimal Toast - subtle events
  word_snipe: 'toast',
  combo_broken: 'toast',
};

// Mascot variant by notification type
export const NOTIFICATION_MASCOTS: Record<TvNotificationType, MascotVariant> = {
  long_word: 'gaming',
  epic_word: 'gaming',
  rare_word: 'celebration',
  combo_5x: 'gaming',
  combo_10x: 'gaming',
  combo_15x: 'celebration',
  combo_20x: 'trophy',
  combo_broken: 'oops',
  first_blood: 'knight',
  overtake: 'rage',
  comeback: 'winner',
  photo_finish: 'flexing',
  word_snipe: 'bomber',
  fire_round_start: 'dj',
  fire_round_end: 'gg',
  achievement: 'trophy',
  level_up: 'winner',
  final_warning: 'panic',
  earthquake: 'scared',
};

export interface TvNotificationData {
  id: string;
  type: TvNotificationType;
  tier: NotificationTier;
  layout: NotificationLayout;
  mascotVariant: MascotVariant;
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
  icon: LucideIcon;
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
    bgGradient: 'from-neo-pink to-neo-pink',
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
    bgGradient: 'from-neo-red to-neo-yellow',
    textColor: 'text-neo-black',
    borderColor: 'border-neo-black',
  },
  combo_10x: {
    icon: Flame,
    bgGradient: 'from-neo-red to-neo-red',
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
    bgGradient: 'from-neo-pink via-neo-pink to-neo-cyan',
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
    bgGradient: 'from-neo-red to-neo-red',
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
    bgGradient: 'from-neo-yellow via-neo-red to-neo-red',
    textColor: 'text-neo-black',
    borderColor: 'border-neo-black',
  },
  photo_finish: {
    icon: Sword,
    bgGradient: 'from-neo-pink to-neo-cyan',
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
    bgGradient: 'from-neo-red via-neo-red to-neo-pink',
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
    bgGradient: 'from-neo-yellow to-neo-red',
    textColor: 'text-neo-black',
    borderColor: 'border-neo-black',
  },
  level_up: {
    icon: Star,
    bgGradient: 'from-neo-pink to-neo-pink',
    textColor: 'text-neo-cream',
    borderColor: 'border-neo-black',
  },
  final_warning: {
    icon: Clock,
    bgGradient: 'from-neo-red to-neo-red',
    textColor: 'text-neo-cream',
    borderColor: 'border-neo-black',
  },
  earthquake: {
    icon: AlertTriangle,
    bgGradient: 'from-neo-red to-neo-red',
    textColor: 'text-neo-cream',
    borderColor: 'border-neo-black',
  },
};

/**
 * TvNotification - Individual notification component with multiple layout styles
 * Renders different layouts based on notification type:
 * - mascot: Mascot with speech bubble for achievements/combos
 * - burst: Explosive radial design for mega events
 * - banner: Full-width for game state announcements
 * - toast: Minimal compact notification for subtle events
 */
const TvNotification = memo<TvNotificationProps>(({
  notification,
  onDismiss,
}) => {
  const config = NOTIFICATION_CONFIGS[notification.type];

  // Auto-dismiss after duration
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(notification.id);
    }, notification.duration);

    return () => clearTimeout(timer);
  }, [notification.id, notification.duration, onDismiss]);

  // Common props for all layouts
  const layoutProps = {
    headline: notification.headline,
    subtext: notification.subtext,
    player: notification.player,
    icon: config.icon,
    mascotVariant: notification.mascotVariant,
    bgGradient: config.bgGradient,
    textColor: config.textColor,
    borderColor: config.borderColor,
  };

  // Hype banner image for overtake/comeback
  const hypeBanner = HYPE_BANNER_IMAGES[notification.type];

  // Render appropriate layout based on notification type
  const content = (() => {
  switch (notification.layout) {
    case 'mascot':
      return (
        <MascotBubbleLayout
          headline={layoutProps.headline}
          player={layoutProps.player}
          icon={layoutProps.icon}
          mascotVariant={layoutProps.mascotVariant}
          bgGradient={layoutProps.bgGradient}
          textColor={layoutProps.textColor}
          borderColor={layoutProps.borderColor}
        />
      );

    case 'burst':
      return (
        <ExplosiveBurstLayout
          headline={layoutProps.headline}
          subtext={layoutProps.subtext}
          player={layoutProps.player}
          icon={layoutProps.icon}
          mascotVariant={layoutProps.mascotVariant}
          bgGradient={layoutProps.bgGradient}
          textColor={layoutProps.textColor}
          borderColor={layoutProps.borderColor}
        />
      );

    case 'banner':
      return (
        <FullWidthBannerLayout
          headline={layoutProps.headline}
          subtext={layoutProps.subtext}
          icon={layoutProps.icon}
          mascotVariant={layoutProps.mascotVariant}
          bgGradient={layoutProps.bgGradient}
          textColor={layoutProps.textColor}
          borderColor={layoutProps.borderColor}
        />
      );

    case 'toast':
      return (
        <MinimalToastLayout
          headline={layoutProps.headline}
          player={layoutProps.player}
          icon={layoutProps.icon}
          bgGradient={layoutProps.bgGradient}
          textColor={layoutProps.textColor}
          borderColor={layoutProps.borderColor}
        />
      );

    default:
      // Fallback to mascot layout
      return (
        <MascotBubbleLayout
          headline={layoutProps.headline}
          player={layoutProps.player}
          icon={layoutProps.icon}
          mascotVariant={layoutProps.mascotVariant}
          bgGradient={layoutProps.bgGradient}
          textColor={layoutProps.textColor}
          borderColor={layoutProps.borderColor}
        />
      );
  }
  })();

  // Wrap with hype banner image if applicable
  if (hypeBanner) {
    return (
      <div className="relative">
        <m.div
          className="absolute -top-20 left-1/2 -translate-x-1/2 w-[500px] pointer-events-none z-0"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 0.9 }}
          transition={{ type: 'spring', stiffness: 500, damping: 20 }}
          aria-hidden="true"
        >
          <Image
            src={hypeBanner}
            alt=""
            width={500}
            height={120}
            className="drop-shadow-[0_0_20px_rgba(255,200,0,0.5)]"
          />
        </m.div>
        <div className="relative z-10">{content}</div>
      </div>
    );
  }

  return content;
});

TvNotification.displayName = 'TvNotification';

export default TvNotification;
