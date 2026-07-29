/**
 * ParentalConsentBanner - Dismissible banner for parental consent
 *
 * Displays a non-intrusive banner prompting users under 14 to provide
 * parental consent for educational features. Follows WCAG 2.0 AA
 * accessibility requirements and neo-brutalist design system.
 *
 * @example
 * ```tsx
 * const { needsConsent } = useParentalConsent();
 * const [showBanner, setShowBanner] = useState(needsConsent);
 *
 * <ParentalConsentBanner
 *   isVisible={showBanner}
 *   onRequestConsent={() => setShowConsentModal(true)}
 *   onDismiss={() => setShowBanner(false)}
 * />
 * ```
 */

'use client';

import React, { memo } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { ShieldCheck, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';

export interface ParentalConsentBannerProps {
  /** Whether the banner is visible */
  isVisible: boolean;
  /** Callback when user wants to provide consent */
  onRequestConsent: () => void;
  /** Callback when user dismisses the banner */
  onDismiss: () => void;
  /** Additional CSS class for the container */
  className?: string;
}

/**
 * ParentalConsentBanner component
 *
 * A dismissible banner that prompts for parental consent.
 * Uses aria-live="polite" to announce to screen readers without interrupting.
 */
export const ParentalConsentBanner = memo<ParentalConsentBannerProps>(({
  isVisible,
  onRequestConsent,
  onDismiss,
  className,
}) => {
  const { t } = useLanguage();

  return (
    <AnimatePresence>
      {isVisible && (
        <m.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className={cn(
            'fixed top-0 inset-x-0 z-[60]',
            'bg-linear-to-r from-neo-purple via-neo-indigo to-neo-purple',
            'text-white',
            'border-b-4 border-neo-black',
            'shadow-hard-xl',
            className
          )}
          style={{
            paddingTop: 'max(env(safe-area-inset-top), 0px)',
          }}
          role="alert"
          aria-live="polite"
          aria-atomic="true"
        >
          <div className="max-w-7xl mx-auto px-3 py-3 sm:px-4 sm:py-4">
            <div className="flex items-start gap-3">
              {/* Icon */}
              <div className={cn(
                'shrink-0 w-10 h-10 sm:w-12 sm:h-12',
                'bg-white/20',
                'border-2 border-white/40 rounded-neo',
                'flex items-center justify-center'
              )}>
                <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                {/* Title */}
                <div className="font-black text-sm sm:text-base uppercase tracking-wide">
                  {t('consent.banner.title')}
                </div>

                {/* Message */}
                <p className="text-xs sm:text-sm mt-1 text-white">
                  {t('consent.banner.message')}
                </p>

                {/* Actions */}
                <div className="flex flex-wrap gap-2 mt-3">
                  <button
                    onClick={onRequestConsent}
                    className={cn(
                      'px-3 py-1.5 sm:px-4 sm:py-2',
                      'border-2 border-neo-black rounded-neo',
                      'font-bold text-xs sm:text-sm uppercase',
                      'transition-all duration-100',
                      'min-h-[44px] min-w-[44px]',
                      'bg-neo-lime text-neo-black',
                      'shadow-hard',
                      'hover:-translate-x-px hover:-translate-y-px hover:shadow-hard-lg',
                      'active:translate-x-px active:translate-y-px active:shadow-none',
                      'focus:outline-hidden focus:ring-2 focus:ring-neo-cyan focus:ring-offset-2'
                    )}
                  >
                    {t('consent.banner.action')}
                  </button>

                  <button
                    onClick={onDismiss}
                    className={cn(
                      'px-3 py-1.5 sm:px-4 sm:py-2',
                      'border-2 border-white/30 rounded-neo',
                      'font-bold text-xs sm:text-sm uppercase',
                      'transition-all duration-100',
                      'min-h-[44px] min-w-[44px]',
                      'bg-white/20 hover:bg-white/30',
                      'focus:outline-hidden focus:ring-2 focus:ring-neo-cyan focus:ring-offset-2'
                    )}
                  >
                    {t('consent.banner.dismiss')}
                  </button>
                </div>
              </div>

              {/* Close button (alternative dismiss) */}
              <button
                onClick={onDismiss}
                className={cn(
                  'shrink-0 w-11 h-11 sm:w-12 sm:h-12',
                  'min-w-[44px] min-h-[44px]',
                  'flex items-center justify-center',
                  'bg-white/20 hover:bg-white/30',
                  'rounded-neo border-2 border-white/30',
                  'transition-colors',
                  'focus:outline-hidden focus:ring-2 focus:ring-neo-cyan focus:ring-offset-2'
                )}
                aria-label={t('common.close')}
              >
                <X className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </div>
          </div>
        </m.div>
      )}
    </AnimatePresence>
  );
});

ParentalConsentBanner.displayName = 'ParentalConsentBanner';

export default ParentalConsentBanner;
