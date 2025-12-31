'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, WifiOff, RefreshCw, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ErrorType = 'network' | 'serverBusy' | 'timeout' | 'sessionExpired' | 'generic';

export interface ErrorAction {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
}

interface ErrorBannerProps {
  /** Whether the error banner is visible */
  isVisible: boolean;
  /** Type of error (determines styling and icon) */
  type: ErrorType;
  /** Error message to display */
  message: string;
  /** Optional detailed explanation */
  details?: string;
  /** Action buttons */
  actions?: ErrorAction[];
  /** Callback when banner is dismissed */
  onDismiss?: () => void;
  /** Whether auto-retry is in progress */
  isRetrying?: boolean;
  /** Countdown for auto-retry (in seconds) */
  retryCountdown?: number;
}

const ERROR_CONFIG: Record<ErrorType, {
  icon: React.ReactNode;
  bgColor: string;
  iconBg: string;
}> = {
  network: {
    icon: <WifiOff className="w-5 h-5 sm:w-6 sm:h-6" />,
    bgColor: 'bg-gradient-to-r from-red-500 via-red-600 to-red-500',
    iconBg: 'bg-red-700/30',
  },
  serverBusy: {
    icon: <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6" />,
    bgColor: 'bg-gradient-to-r from-orange-500 via-orange-600 to-orange-500',
    iconBg: 'bg-orange-700/30',
  },
  timeout: {
    icon: <RefreshCw className="w-5 h-5 sm:w-6 sm:h-6" />,
    bgColor: 'bg-gradient-to-r from-yellow-500 via-yellow-600 to-yellow-500',
    iconBg: 'bg-yellow-700/30',
  },
  sessionExpired: {
    icon: <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6" />,
    bgColor: 'bg-gradient-to-r from-purple-500 via-purple-600 to-purple-500',
    iconBg: 'bg-purple-700/30',
  },
  generic: {
    icon: <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6" />,
    bgColor: 'bg-gradient-to-r from-red-500 via-red-600 to-red-500',
    iconBg: 'bg-red-700/30',
  },
};

/**
 * ErrorBanner - Persistent error banner with actionable guidance
 *
 * Shows critical errors that need user attention with clear actions
 * Replaces generic toast notifications for important errors
 */
export function ErrorBanner({
  isVisible,
  type,
  message,
  details,
  actions = [],
  onDismiss,
  isRetrying = false,
  retryCountdown,
}: ErrorBannerProps) {
  const config = ERROR_CONFIG[type];

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className={cn(
            'fixed top-0 inset-x-0 z-[70]',
            config.bgColor,
            'text-white',
            'border-b-4 border-neo-black',
            'shadow-hard-xl'
          )}
          style={{
            paddingTop: 'max(env(safe-area-inset-top), 0px)',
          }}
          role="alert"
          aria-live="assertive"
          aria-atomic="true"
        >
          <div className="max-w-7xl mx-auto px-3 py-3 sm:px-4 sm:py-4">
            <div className="flex items-start gap-3">
              {/* Icon */}
              <div className={cn(
                'flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12',
                config.iconBg,
                'border-2 border-white/40 rounded-neo',
                'flex items-center justify-center',
                isRetrying && 'animate-pulse'
              )}>
                {isRetrying ? (
                  <RefreshCw className="w-5 h-5 sm:w-6 sm:h-6 animate-spin" />
                ) : (
                  config.icon
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                {/* Message */}
                <div className="font-black text-sm sm:text-base uppercase tracking-wide">
                  {message}
                </div>

                {/* Details */}
                {details && (
                  <p className="text-xs sm:text-sm mt-1 text-white/90">
                    {details}
                  </p>
                )}

                {/* Retry countdown */}
                {retryCountdown !== undefined && retryCountdown > 0 && (
                  <p className="text-xs sm:text-sm mt-1 text-white/80">
                    Retrying in {retryCountdown}s...
                  </p>
                )}

                {/* Actions */}
                {actions.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {actions.map((action, index) => (
                      <button
                        key={index}
                        onClick={action.onClick}
                        className={cn(
                          'px-3 py-1.5 sm:px-4 sm:py-2',
                          'border-2 border-neo-black rounded-neo',
                          'font-bold text-xs sm:text-sm uppercase',
                          'transition-all duration-100',
                          'min-h-[44px] min-w-[44px]',
                          action.variant === 'secondary'
                            ? 'bg-white/20 hover:bg-white/30'
                            : 'bg-white text-neo-black shadow-hard hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-hard-lg active:translate-x-[1px] active:translate-y-[1px] active:shadow-none'
                        )}
                      >
                        {action.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Dismiss button */}
              {onDismiss && (
                <button
                  onClick={onDismiss}
                  className="flex-shrink-0 w-11 h-11 sm:w-12 sm:h-12 min-w-[44px] min-h-[44px] flex items-center justify-center bg-white/20 hover:bg-white/30 rounded-neo border-2 border-white/30 transition-colors"
                  aria-label="Dismiss error"
                >
                  <X className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
              )}
            </div>
          </div>

          {/* Progress bar for retry countdown */}
          {retryCountdown !== undefined && retryCountdown > 0 && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10 overflow-hidden">
              <motion.div
                className="h-full bg-white/40"
                initial={{ width: '100%' }}
                animate={{ width: '0%' }}
                transition={{ duration: retryCountdown, ease: 'linear' }}
              />
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default ErrorBanner;
