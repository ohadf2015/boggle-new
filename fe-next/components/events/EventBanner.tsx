'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, Clock, X, Zap } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { AdaptiveMotion, AdaptiveAnimatePresence } from '@/components/motion/AdaptiveMotion';
import { cn } from '@/lib/utils';
import { formatCountdownFromMs } from '@/shared/utils';

interface EventConfig {
  theme?: string;
  accentColor?: string;
  [key: string]: unknown;
}

interface EventData {
  id: string;
  name: string;
  description: string;
  type: 'tournament' | 'holiday' | 'weekend' | 'special';
  status: 'upcoming' | 'active' | 'ended';
  start_time: string;
  end_time: string;
  config: EventConfig;
  rewards: Array<{ position: number; coins: number; title?: string; badge?: string }>;
}

interface EventBannerProps {
  event: EventData;
  onJoin: (eventId: string) => void;
  onDismiss: () => void;
  hasJoined?: boolean;
  className?: string;
}

const EventBanner: React.FC<EventBannerProps> = ({
  event,
  onJoin,
  onDismiss,
  hasJoined = false,
  className,
}) => {
  const { t } = useLanguage();
  const [timeRemaining, setTimeRemaining] = useState(() =>
    Math.max(0, new Date(event.end_time).getTime() - Date.now())
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeRemaining(Math.max(0, new Date(event.end_time).getTime() - Date.now()));
    }, 1000);
    return () => clearInterval(interval);
  }, [event.end_time]);

  const totalDuration = new Date(event.end_time).getTime() - new Date(event.start_time).getTime();
  const elapsed = totalDuration - timeRemaining;
  const progress = totalDuration > 0 ? Math.min(1, elapsed / totalDuration) : 1;
  const accentColor = event.config?.accentColor || '#FFE135';

  return (
    <AdaptiveAnimatePresence>
      <AdaptiveMotion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
      >
        <div
          data-testid="event-banner"
          className={cn(
            'relative border-3 border-black rounded-neo shadow-hard p-4',
            'bg-linear-to-r from-neo-navy to-neo-navy/90',
            className
          )}
          style={{ borderColor: accentColor }}
        >
          {/* Dismiss button */}
          <button
            type="button"
            onClick={onDismiss}
            aria-label={t('events.dismiss')}
            className="absolute top-2 right-2 p-1 text-white hover:text-white transition-colors"
          >
            <X size={18} />
          </button>

          <div className="flex items-start gap-3">
            {/* Event icon */}
            <div
              className="shrink-0 w-10 h-10 rounded-neo border-2 border-black flex items-center justify-center"
              style={{ backgroundColor: accentColor }}
            >
              <Calendar size={20} className="text-black" />
            </div>

            <div className="flex-1 min-w-0">
              {/* Title & description */}
              <h3 className="font-neo-display text-lg font-bold text-white truncate">
                {event.name}
              </h3>
              <p className="text-sm text-white line-clamp-2 mt-0.5">
                {event.description}
              </p>

              {/* Countdown */}
              <div className="flex items-center gap-2 mt-2" data-testid="event-countdown">
                <Clock size={14} className="text-white" />
                <span className="text-sm font-mono text-white">
                  {t('events.endsIn')} {formatCountdownFromMs(timeRemaining)}
                </span>
              </div>

              {/* Progress bar */}
              <div
                className="mt-2 h-2 bg-white/10 rounded-full overflow-hidden border border-white/20"
                data-testid="event-progress-bar"
              >
                <div
                  className="h-full rounded-full transition-all duration-1000"
                  style={{
                    width: `${(1 - progress) * 100}%`,
                    backgroundColor: accentColor,
                  }}
                />
              </div>
            </div>

            {/* CTA */}
            <div className="shrink-0 self-center">
              {hasJoined ? (
                <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-neo border-2 border-black bg-green-500 text-black font-bold text-sm shadow-hard-sm">
                  <Zap size={14} />
                  {t('events.joined')}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => onJoin(event.id)}
                  className={cn(
                    'px-4 py-2 rounded-neo border-3 border-black font-bold text-sm text-black',
                    'shadow-hard-sm hover:shadow-hard-pressed active:translate-y-0.5',
                    'transition-all duration-150'
                  )}
                  style={{ backgroundColor: accentColor }}
                >
                  {t('events.joinNow')}
                </button>
              )}
            </div>
          </div>
        </div>
      </AdaptiveMotion.div>
    </AdaptiveAnimatePresence>
  );
};

export default EventBanner;
