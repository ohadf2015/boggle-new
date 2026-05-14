'use client';

import { m, AnimatePresence } from 'framer-motion';
import { Crown } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
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
          key={event.type + event.newLeader}
          data-testid="lead-change-banner"
          dir={dir}
          initial={{ y: 0, opacity: 0, scale: 0.9 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 0, opacity: 0, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          className={`
            absolute top-0 left-1/2 -translate-x-1/2 z-50
            pointer-events-none
            flex items-center gap-1.5
            px-3 py-1
            border-3 border-neo-black shadow-hard-sm rounded-neo
            text-xs sm:text-sm font-neo-display font-bold text-neo-black
            ${event.type === 'took-lead' ? 'bg-neo-lime' : 'bg-neo-pink'}
          `}
        >
          {event.type === 'took-lead' && <Crown size={14} />}
          <span>
            {event.type === 'took-lead'
              ? t('leadChange.tookLead')
              : t('leadChange.lostLead', { username: event.newLeader })}
          </span>
        </m.div>
      )}
    </AnimatePresence>
  );
}
