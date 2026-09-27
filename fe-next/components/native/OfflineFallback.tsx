'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { Mascot } from '@/components/ui/Mascot';
import { WifiOff, RefreshCw } from 'lucide-react';
import { OFFLINE_MODES } from '@/lib/offline/offlineCapableModes';

interface OfflineFallbackProps {
  /** Callback when retry button is clicked */
  onRetry: () => void;
  /** Whether a retry is in progress */
  isRetrying?: boolean;
}

/**
 * OfflineFallback - Displayed when native app can't reach the server
 *
 * Used in Capacitor native apps when the WebView can't load the webapp.
 * Provides branded offline experience with retry functionality.
 *
 * @example
 * <OfflineFallback
 *   onRetry={() => window.location.reload()}
 *   isRetrying={isConnecting}
 * />
 */
export function OfflineFallback({ onRetry, isRetrying = false }: OfflineFallbackProps): React.ReactElement {
  const { t, dir, language } = useLanguage();

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center bg-neo-navy text-neo-white p-6"
      dir={dir}
    >
      {/* Logo */}
      <div className="mb-8">
        <Image
          src="/logos/lexiclash_logo_english-min.webp"
          alt="LexiClash"
          width={240}
          height={180}
          className="h-auto w-auto max-w-[240px]"
          priority
        />
      </div>

      {/* Mascot + Offline Icon */}
      <Mascot variant="sad" size="xs" animated={false} className="mb-4" />
      <div className="mb-6 rounded-full bg-neo-orange/20 p-6">
        <WifiOff className="h-16 w-16 text-neo-orange" aria-hidden="true" />
      </div>

      {/* Title */}
      <h1 className="mb-3 text-2xl font-bold font-neo-display text-center">
        {t('native.offline.title')}
      </h1>

      {/* Message */}
      <p className="mb-8 text-center text-neo-white max-w-xs">
        {t('native.offline.message')}
      </p>

      {/* Retry Button */}
      <button
        type="button"
        onClick={onRetry}
        disabled={isRetrying}
        className={`
          flex items-center gap-2 px-8 py-3
          font-neo-body font-bold text-lg
          rounded-neo border-neo border-black
          transition-all duration-150
          ${isRetrying
            ? 'bg-neo-yellow/50 cursor-not-allowed'
            : 'bg-neo-yellow shadow-hard hover:shadow-hard-pressed active:translate-x-[2px] active:translate-y-[2px]'
          }
        `}
      >
        <RefreshCw
          className={`h-5 w-5 ${isRetrying ? 'animate-spin' : ''}`}
          aria-hidden="true"
        />
        {isRetrying ? t('native.offline.retrying') : t('native.offline.retry')}
      </button>

      {/* Offline launcher — modes that work with no network */}
      <div className="mt-10 w-full max-w-xs">
        <p className="mb-3 text-center text-sm font-neo-body text-neo-cream/80">
          {t('native.offline.playablePrompt')}
        </p>
        <div className="flex flex-col gap-3">
          {OFFLINE_MODES.map(({ labelKey, entry }) => (
            <Link
              key={labelKey}
              href={entry(language)}
              className="
                flex items-center justify-center px-6 py-3
                font-neo-body font-bold
                rounded-neo border-neo border-black
                bg-neo-cyan text-black
                shadow-hard hover:shadow-hard-pressed
                active:translate-x-[2px] active:translate-y-[2px]
                transition-all duration-150
              "
            >
              {t(labelKey)}
            </Link>
          ))}
        </div>
      </div>

      {/* Subtle version info */}
      <p className="mt-auto pt-8 text-xs text-neo-white">
        LexiClash
      </p>
    </div>
  );
}

export default OfflineFallback;
