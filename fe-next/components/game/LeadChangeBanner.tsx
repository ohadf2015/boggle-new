'use client';

import { m, AnimatePresence } from 'framer-motion';
import { Crown, Zap, TrendingUp, ArrowUp } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import type { LeadChangeEvent } from '@/hooks/useLeadChangeDetection';

interface LeadChangeBannerProps {
  event: LeadChangeEvent | null;
}

export function LeadChangeBanner({ event }: LeadChangeBannerProps) {
  const { t, dir } = useLanguage();

  return (
    <AnimatePresence>
      {event && (
        <m.div
          key={event.type + event.newLeader + (event.scoreGap ?? 0)}
          data-testid="lead-change-banner"
          dir={dir}
          initial={{ y: 0, opacity: 0, scale: 0.9 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 0, opacity: 0, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          className={cn(
            'absolute top-0 left-1/2 -translate-x-1/2 z-50',
            'pointer-events-none',
            'flex items-center gap-1.5',
            'px-3 py-1.5',
            'border-3 border-neo-black shadow-hard-sm rounded-neo',
            'text-xs sm:text-sm font-neo-display font-bold',
            event.type === 'took-lead'
              ? 'bg-neo-lime text-neo-black'
              : 'bg-neo-pink text-white',
          )}
        >
          {event.type === 'took-lead' ? (
            <m.span
              key="crown"
              initial={{ rotate: -30, scale: 0 }}
              animate={{ rotate: 0, scale: 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 12, delay: 0.1 }}
            >
              <Crown size={14} className="fill-current" />
            </m.span>
          ) : (
            <Zap size={14} className="shrink-0" />
          )}
          <span className="flex items-center gap-1">
            {event.type === 'took-lead' ? (
              <>
                <span>{t('leadChange.tookLead')}</span>
                {event.scoreGap != null && event.scoreGap > 0 && (
                  <m.span
                    key="gap"
                    initial={{ opacity: 0, x: -5 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                    className="text-[10px] opacity-80"
                  >
                    (+{event.scoreGap})
                  </m.span>
                )}
              </>
            ) : (
              <span>{t('leadChange.lostLead', { username: event.newLeader })}</span>
            )}
          </span>
          {event.type === 'took-lead' && (
            <m.span
              key="arrow"
              initial={{ y: 5, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 300 }}
            >
              <TrendingUp size={14} className="shrink-0" />
            </m.span>
          )}
        </m.div>
      )}
    </AnimatePresence>
  );
}
