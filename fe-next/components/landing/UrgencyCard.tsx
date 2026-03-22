'use client';

/**
 * UrgencyCard Component
 *
 * Displays a single personalized urgency card on the landing page.
 * Shows the highest-priority action item (streak at risk, daily unsolved, etc.)
 * Hidden for unauthenticated users and when no urgency exists.
 */

import { useRouter } from 'next/navigation';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { useUrgencyData, type UrgencyType } from '@/hooks/useUrgencyData';

const JELLY_SPRING = { type: 'spring' as const, stiffness: 260, damping: 12 };

interface UrgencyConfig {
  glowColor: string;
  /** Full Tailwind classes — no dynamic construction */
  gradientClass: string;
  stripeClass: string;
  iconRingClass: string;
  ctaBgClass: string;
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
      className="w-6 h-6 sm:w-7 sm:h-7 drop-shadow-[0_0_6px_rgba(255,20,147,0.6)]"
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
      className="w-6 h-6 sm:w-7 sm:h-7 drop-shadow-[0_0_6px_rgba(255,225,53,0.6)]"
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
      glowColor: 'rgba(255, 20, 147, 0.35)',
      gradientClass: 'bg-gradient-to-r from-neo-pink/15 via-neo-pink/5 to-transparent',
      stripeClass: 'bg-neo-pink',
      iconRingClass: 'border-neo-pink bg-neo-pink/10',
      ctaBgClass: 'bg-neo-pink text-neo-white',
      icon: <FlameIcon />,
      messageKey: 'urgency.streakAtRisk',
      actionKey: 'urgency.streakAction',
      href: `/${language}/singleplayer`,
      pulseIcon: true,
    },
    'daily-unsolved': {
      glowColor: 'rgba(255, 225, 53, 0.35)',
      gradientClass: 'bg-gradient-to-r from-neo-yellow/15 via-neo-yellow/5 to-transparent',
      stripeClass: 'bg-neo-yellow',
      iconRingClass: 'border-neo-yellow bg-neo-yellow/10',
      ctaBgClass: 'bg-neo-yellow text-neo-black',
      icon: <StarIcon />,
      messageKey: 'urgency.dailyUnsolved',
      actionKey: 'urgency.dailyAction',
      href: `/${language}/daily`,
    },
  };

  return configs[type] ?? configs['daily-unsolved'];
}

export function UrgencyCard() {
  const { t, language, dir } = useLanguage();
  const router = useRouter();
  const urgency = useUrgencyData();
  const shouldReduceMotion = useReducedMotion();
  const isRTL = dir === 'rtl';

  if (!urgency) return null;

  const config = getUrgencyConfig(urgency.type, language);

  const handleClick = () => {
    router.push(config.href);
  };

  const arrowChar = isRTL ? '←' : '→';

  return (
    <AnimatePresence>
      <motion.div
        role="status"
        aria-live="polite"
        data-testid="urgency-card"
        initial={{ opacity: 0, y: 16, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -12, scale: 0.97 }}
        transition={shouldReduceMotion ? { duration: 0.2 } : { duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-4xl mx-auto"
      >
        <motion.button
          onClick={handleClick}
          whileHover={shouldReduceMotion
            ? { opacity: 0.9 }
            : { scaleX: 1.02, scaleY: 0.98 }
          }
          whileTap={shouldReduceMotion
            ? undefined
            : { scaleX: 0.98, scaleY: 1.01 }
          }
          transition={shouldReduceMotion ? { duration: 0.15 } : JELLY_SPRING}
          className="
            w-full relative overflow-hidden
            border-3 border-neo-black
            bg-neo-navy
            rounded-neo shadow-hard
            active:shadow-hard-pressed
            active:translate-x-[2px] active:translate-y-[2px]
            p-3 sm:p-4
            flex items-center gap-3 sm:gap-4
            cursor-pointer transition-shadow duration-150
            text-start group
          "
          style={!shouldReduceMotion ? {
            boxShadow: `0 0 24px ${config.glowColor}, 0 0 48px ${config.glowColor.replace('0.35', '0.15')}, 4px 4px 0px rgb(var(--neo-black))`,
          } : undefined}
        >
          {/* Accent gradient background */}
          <div
            className={`absolute inset-0 ${config.gradientClass} pointer-events-none`}
            aria-hidden="true"
          />

          {/* Accent edge stripe */}
          <div
            className={`absolute top-0 bottom-0 w-1 ${config.stripeClass} ${isRTL ? 'right-0' : 'left-0'}`}
            aria-hidden="true"
          />

          {/* Periodic shimmer sweep */}
          {!shouldReduceMotion && (
            <motion.div
              className="absolute inset-0 pointer-events-none"
              aria-hidden="true"
            >
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -skew-x-12"
                animate={{ x: ['-100%', '200%'] }}
                transition={{
                  duration: 1.8,
                  repeat: Infinity,
                  repeatDelay: 5,
                  ease: 'easeInOut',
                }}
              />
            </motion.div>
          )}

          {/* Icon with breathing pulse */}
          <motion.div
            className={`
              flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12
              flex items-center justify-center
              rounded-full border-2 ${config.iconRingClass}
              relative z-10
            `}
            animate={shouldReduceMotion ? undefined : {
              scale: [1, 1.15, 1],
              rotate: [0, config.pulseIcon ? 10 : 4, 0],
            }}
            transition={{
              duration: 1.8,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          >
            {config.icon}
          </motion.div>

          {/* Message */}
          <div className="flex-1 min-w-0 relative z-10">
            <p className="font-neo-display text-sm sm:text-base text-neo-white font-bold leading-snug">
              {t(config.messageKey, urgency.data)}
            </p>
          </div>

          {/* CTA button */}
          <motion.div
            data-testid="urgency-cta"
            className={`
              flex-shrink-0 relative z-10
              px-3 sm:px-4 py-1.5 sm:py-2
              ${config.ctaBgClass}
              font-neo-display font-bold text-xs sm:text-sm
              border-2 border-neo-black rounded-neo
              shadow-hard-sm
              group-active:shadow-none group-active:translate-x-[1px] group-active:translate-y-[1px]
              whitespace-nowrap
            `}
            animate={shouldReduceMotion ? undefined : { scale: [1, 1.04, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          >
            {t(config.actionKey)} {arrowChar}
          </motion.div>
        </motion.button>
      </motion.div>
    </AnimatePresence>
  );
}

export default UrgencyCard;
