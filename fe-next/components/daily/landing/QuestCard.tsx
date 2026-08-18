'use client';

import { useState, type ReactNode } from 'react';
import { m } from 'framer-motion';
import {
  Timer, Hourglass, Check, X, Loader2, Bell,
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useDevicePerformance } from '@/hooks/useDevicePerformance';
import { useTiltEffect } from '@/hooks/useTiltEffect';
import { cn } from '@/lib/utils';
import type { Language } from '@/types';

export interface QuestCardProps {
  challengeId: string;
  icon: ReactNode;
  title: string;
  tagline: string;
  details?: string;
  /** `yellow` and `cyan` both render the cyan chrome below — kept distinct so
   *  callers name their own accent; only `orange` branches. */
  color: 'orange' | 'yellow' | 'cyan';
  status: 'new' | 'won' | 'lost' | 'unavailable';
  isLoadingStatus?: boolean;
  onPlay: () => void;
  buttonText: string;
  timeMode: 'timed' | 'relaxed';
  timeModeLabel: string;
  badge?: string;
  delay?: number;
  customPreview?: 'word-hunt-grid';
  currentLanguage?: Language;
  previewImageUrl?: string;
  previewImageAlt?: string;
  onRequestChallenge?: () => void;
  requestState?: 'idle' | 'loading' | 'sent';
  variant?: 'primary' | 'secondary';
}

export function QuestCard({
  challengeId,
  icon,
  title,
  tagline,
  color,
  status,
  isLoadingStatus = false,
  onPlay,
  buttonText,
  timeMode,
  timeModeLabel,
  badge,
  delay = 0,
  onRequestChallenge,
  requestState = 'idle',
  variant = 'primary',
  previewImageUrl,
}: QuestCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const { enableComplexAnimations, prefersReducedMotion } = useDevicePerformance();

  const { ref, style: tiltStyle, handlers: tiltHandlers } = useTiltEffect<HTMLDivElement>({
    maxTilt: 10,
    hoverScale: 1.03,
    perspective: 800,
  });

  const handleMouseEnter = () => {
    setIsHovered(true);
    tiltHandlers.onMouseEnter();
  };
  const handleMouseLeave = () => {
    setIsHovered(false);
    tiltHandlers.onMouseLeave();
  };

  const isUnavailable = status === 'unavailable';
  const isCompleted = status === 'won' || status === 'lost';
  const showEffects = enableComplexAnimations && !prefersReducedMotion;
  const isNew = status === 'new';
  const isSecondary = variant === 'secondary';

  const colorConfig = color === 'orange'
    ? {
        text: 'text-neo-orange',
        bg: 'bg-neo-orange',
        pill: 'bg-neo-orange/20 border-neo-orange text-neo-orange',
        iconBg: 'bg-neo-orange',
        gradient: 'from-neo-orange/15',
        accent: 'bg-neo-orange',
        glow: 'bg-neo-orange/30',
      }
    : {
        text: 'text-neo-cyan',
        bg: 'bg-neo-cyan',
        pill: 'bg-neo-cyan/20 border-neo-cyan text-neo-cyan',
        iconBg: 'bg-neo-cyan',
        gradient: 'from-neo-cyan/15',
        accent: 'bg-neo-cyan',
        glow: 'bg-neo-cyan/30',
      };

  const handleClick = () => {
    if (isUnavailable && onRequestChallenge) {
      onRequestChallenge();
    } else if (!isUnavailable) {
      onPlay();
    }
  };

  return (
    <m.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, type: 'spring', stiffness: 300, damping: 25 }}
      className={cn('relative', isNew && showEffects && 'animate-breathing')}
      data-testid={`quest-card-${challengeId}`}
    >
      {/* Glow ring for new challenges */}
      {isNew && (
        <div className={cn('absolute -inset-0.5 rounded-xl -z-10', colorConfig.glow)} />
      )}

      <div
        ref={ref}
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onMouseMove={tiltHandlers.onMouseMove}
        onTouchStart={tiltHandlers.onTouchStart}
        onTouchMove={tiltHandlers.onTouchMove}
        onTouchEnd={tiltHandlers.onTouchEnd}
        role="button"
        tabIndex={0}
        onKeyDown={(e: React.KeyboardEvent) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleClick();
          }
        }}
        className={cn(
          'relative w-full bg-neo-navy/95 rounded-xl border-3 border-neo-black',
          'shadow-hard overflow-hidden cursor-pointer',
          isSecondary
            ? 'flex flex-row items-center gap-3 p-3'
            : 'flex flex-col gap-3 p-4 md:flex-row md:items-center md:gap-4',
          !isSecondary && previewImageUrl && 'min-h-[170px] md:min-h-[130px]',
          'focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-neo-lime',
          'transition-shadow duration-200 group',
          requestState === 'loading' && 'opacity-50 cursor-not-allowed',
          isCompleted && 'opacity-85',
          isUnavailable && 'opacity-60'
        )}
        style={{
          ...tiltStyle,
          ...(previewImageUrl ? {
            backgroundImage: `url(${previewImageUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center center',
          } : {}),
        }}
      >
        {/* Accent strip */}
        {!isSecondary && (
          <div className={cn('absolute inset-e-0 top-0 bottom-0 w-2', colorConfig.accent)} />
        )}

        {/* Gradient overlay */}
        {!isSecondary && !previewImageUrl && (
          <div className={cn(
            'absolute inset-x-0 top-0 h-16 bg-linear-to-b to-transparent pointer-events-none',
            colorConfig.gradient
          )} />
        )}
        {!isSecondary && previewImageUrl && (
          <div
            data-testid="quest-card-image-overlay"
            className="absolute inset-0 bg-gradient-to-t from-slate-900/98 via-slate-900/70 to-slate-900/30 pointer-events-none"
          />
        )}

        {/* Holographic shimmer on hover */}
        {showEffects && isHovered && !isSecondary && (
          <div className="absolute inset-0 z-20 pointer-events-none overflow-hidden" aria-hidden="true">
            <div
              className="absolute top-0 w-[60%] h-full bg-linear-to-r from-transparent via-white/10 to-transparent -skew-x-12 animate-hologram-shimmer"
              style={{ left: '-150%' }}
            />
          </div>
        )}

        {/* Secondary: compact inline icon only */}
        {isSecondary ? (
          <div className="relative shrink-0">
            <div className={cn(
              'rounded-full border-2 border-neo-black',
              'flex items-center justify-center text-neo-black',
              'shadow-hard-xs group-hover:scale-110 transition-transform',
              colorConfig.iconBg,
              'w-9 h-9'
            )}>
              <span className="[&>svg]:w-4 [&>svg]:h-4">{icon}</span>
            </div>
            {!isLoadingStatus && isCompleted && (
              <m.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className={cn(
                  'absolute -top-1 -inset-s-1 p-0.5 rounded-full border-2 border-neo-black shadow-hard-xs',
                  status === 'won' ? 'bg-neo-lime' : 'bg-neo-pink'
                )}
                data-testid={status === 'won' ? 'won-badge' : 'lost-badge'}
              >
                {status === 'won'
                  ? <Check className="w-3 h-3 text-neo-black" strokeWidth={3} />
                  : <X className="w-3 h-3 text-neo-black" strokeWidth={3} />
                }
              </m.div>
            )}
          </div>
        ) : (
          /* Primary: full top row with pill badge + circular icon */
          <>
            <div className="flex items-start justify-between relative z-10 md:flex-col md:items-center md:gap-2 md:shrink-0">
              <div className={cn(
                'flex items-center gap-1.5 px-3 py-1 rounded-full border-2 text-[10px] font-black uppercase tracking-wide',
                colorConfig.pill
              )}>
                {timeMode === 'timed'
                  ? <Timer className="w-3.5 h-3.5" />
                  : <Hourglass className="w-3.5 h-3.5" />
                }
                <span>{timeModeLabel}</span>
              </div>

              <div className="relative">
                <div className={cn(
                  'w-10 h-10 rounded-full border-2 border-neo-black',
                  'flex items-center justify-center text-neo-black',
                  'shadow-hard-xs group-hover:scale-110 transition-transform',
                  colorConfig.iconBg
                )}>
                  <span className="[&>svg]:w-5 [&>svg]:h-5">{icon}</span>
                </div>

                {!isLoadingStatus && isCompleted && (
                  <m.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className={cn(
                      'absolute -top-1 -inset-s-1 p-0.5 rounded-full border-2 border-neo-black shadow-hard-xs',
                      status === 'won' ? 'bg-neo-lime' : 'bg-neo-pink'
                    )}
                    data-testid={status === 'won' ? 'won-badge' : 'lost-badge'}
                  >
                    {status === 'won'
                      ? <Check className="w-3 h-3 text-neo-black" strokeWidth={3} />
                      : <X className="w-3 h-3 text-neo-black" strokeWidth={3} />
                    }
                  </m.div>
                )}

                {isLoadingStatus && (
                  <div className="absolute -top-1 -inset-s-1 p-0.5 rounded-full bg-neo-navy-elevated border border-slate-600">
                    <Loader2 className="w-3 h-3 animate-spin text-slate-400" />
                  </div>
                )}

                {badge && !isCompleted && !isLoadingStatus && (
                  <div className="absolute -bottom-1 -inset-e-1 bg-neo-pink px-1.5 py-0.5 border border-neo-black text-[8px] font-black text-white rounded-md shadow-hard-xs uppercase">
                    {badge}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Content */}
        <div className={cn('relative z-10', isSecondary ? 'flex-1 min-w-0' : 'space-y-1 md:flex-1 md:min-w-0')}>
          <h2 className={cn(
            'font-neo-display font-black leading-none',
            colorConfig.text,
            isSecondary ? 'text-lg' : 'text-2xl'
          )}>
            {title}
          </h2>
          {!isSecondary && (
            <p className="text-[13px] text-slate-400 line-clamp-2">
              {tagline}
            </p>
          )}
        </div>

        {/* CTA button */}
        {isUnavailable ? (
          <UnavailableButton requestState={requestState} />
        ) : (
          <div className={cn(
            'relative z-10 font-black uppercase rounded-lg text-center',
            colorConfig.bg,
            'text-neo-black border-2 border-neo-black shadow-hard-sm',
            'active:translate-y-0.5 active:shadow-none transition-all',
            isSecondary
              ? 'py-2.5 text-[10px] px-4 shrink-0'
              : 'w-full py-3 text-xs md:w-auto md:px-8 md:shrink-0'
          )}>
            {buttonText}
          </div>
        )}
      </div>
    </m.div>
  );
}

/** Button shown when challenge is unavailable */
function UnavailableButton({ requestState }: { requestState: string }) {
  const { t } = useLanguage();

  return (
    <div className={cn(
      'w-full py-3.5 text-xs font-black uppercase rounded-lg',
      'flex items-center justify-center gap-2',
      requestState === 'sent'
        ? 'bg-neo-lime/20 text-neo-lime border-2 border-neo-lime'
        : 'bg-neo-navy-elevated text-slate-200 border-2 border-slate-600',
      'shadow-hard-sm transition-all'
    )}>
      {requestState === 'loading' ? (
        <><Loader2 className="w-4 h-4 animate-spin" />{t('common.loading')}</>
      ) : requestState === 'sent' ? (
        <><Check className="w-4 h-4" />{t('daily.requestSent')}</>
      ) : (
        <><Bell className="w-4 h-4" />{t('daily.requestChallenge')}</>
      )}
    </div>
  );
}
