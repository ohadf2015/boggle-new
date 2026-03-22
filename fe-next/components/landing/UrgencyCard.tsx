'use client';

/**
 * UrgencyCard Component
 *
 * Displays a single personalized urgency card on the landing page.
 * Shows the highest-priority action item (streak at risk, daily unsolved, etc.)
 * Hidden for unauthenticated users and when no urgency exists.
 */

import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { useUrgencyData, type UrgencyType } from '@/hooks/useUrgencyData';

interface UrgencyConfig {
  borderClass: string;
  bgClass: string;
  icon: React.ReactNode;
  messageKey: string;
  actionKey: string;
  href: string;
  pulseIcon?: boolean;
}

function FlameIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="w-7 h-7 text-neo-pink"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M12.963 2.286a.75.75 0 00-1.071-.136 9.742 9.742 0 00-3.539 6.177A7.547 7.547 0 016.648 6.61a.75.75 0 00-1.152.082A9 9 0 1015.68 4.534a7.46 7.46 0 01-2.717-2.248zM15.75 14.25a3.75 3.75 0 11-7.313-1.172c.628.465 1.35.81 2.133 1a5.99 5.99 0 011.925-3.545 3.75 3.75 0 013.255 3.717z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="w-7 h-7 text-neo-yellow"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function getUrgencyConfig(type: UrgencyType, language: string): UrgencyConfig {
  const configs: Record<string, UrgencyConfig> = {
    'streak-risk': {
      borderClass: 'border-neo-pink',
      bgClass: 'bg-neo-pink/10',
      icon: <FlameIcon />,
      messageKey: 'urgency.streakAtRisk',
      actionKey: 'urgency.streakAction',
      href: `/${language}/singleplayer`,
      pulseIcon: true,
    },
    'daily-unsolved': {
      borderClass: 'border-neo-yellow',
      bgClass: 'bg-neo-yellow/10',
      icon: <StarIcon />,
      messageKey: 'urgency.dailyUnsolved',
      actionKey: 'urgency.dailyAction',
      href: `/${language}/daily`,
    },
  };

  return configs[type] ?? configs['daily-unsolved'];
}

export function UrgencyCard() {
  const { t, language } = useLanguage();
  const router = useRouter();
  const urgency = useUrgencyData();

  if (!urgency) return null;

  const config = getUrgencyConfig(urgency.type, language);

  const handleClick = () => {
    router.push(config.href);
  };

  return (
    <AnimatePresence>
      <motion.div
        role="status"
        aria-live="polite"
        data-testid="urgency-card"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        transition={{ duration: 0.3 }}
        className={`
          w-full max-w-4xl mx-auto
          border-4 ${config.borderClass} ${config.bgClass}
          rounded-neo-lg shadow-hard-lg
          p-4 sm:p-5
          flex items-center gap-3 sm:gap-4
        `}
      >
        {/* Icon */}
        <div
          className={`
            flex-shrink-0
            ${config.pulseIcon ? 'animate-pulse' : ''}
          `}
        >
          {config.icon}
        </div>

        {/* Message */}
        <div className="flex-1 min-w-0">
          <p className="font-neo-display text-sm sm:text-base text-neo-white leading-snug">
            {t(config.messageKey, urgency.data)}
          </p>
        </div>

        {/* CTA Button */}
        <motion.button
          data-testid="urgency-cta"
          onClick={handleClick}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className={`
            flex-shrink-0
            px-4 py-2 sm:px-5 sm:py-2.5
            font-neo-display text-sm sm:text-base font-bold
            text-neo-navy bg-neo-yellow
            border-3 border-black rounded-neo
            shadow-hard-sm
            hover:shadow-hard active:shadow-hard-pressed
            transition-shadow duration-150
            cursor-pointer
          `}
        >
          {t(config.actionKey)}
        </motion.button>
      </motion.div>
    </AnimatePresence>
  );
}

export default UrgencyCard;
