'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, RefreshCw, AlertTriangle } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export type MultiplayerError =
  | 'room-full'
  | 'room-closed'
  | 'invalid-code'
  | 'connection-lost'
  | 'host-left'
  | 'server-error'
  | null;

const ERROR_KEYS: Record<NonNullable<MultiplayerError>, string> = {
  'room-full': 'multiplayerFlow.errors.roomFull',
  'room-closed': 'multiplayerFlow.errors.roomClosed',
  'invalid-code': 'multiplayerFlow.errors.invalidCode',
  'connection-lost': 'multiplayerFlow.errors.connectionLost',
  'host-left': 'multiplayerFlow.errors.hostLeft',
  'server-error': 'multiplayerFlow.errors.serverError',
};

interface MultiplayerErrorBannerProps {
  error: MultiplayerError;
  onDismiss: () => void;
  onRetry?: () => void;
}

export const MultiplayerErrorBanner: React.FC<MultiplayerErrorBannerProps> = ({
  error,
  onDismiss,
  onRetry,
}) => {
  const { t } = useLanguage();

  if (!error) return null;

  const showRetry = error === 'connection-lost' && onRetry;

  return (
    <AnimatePresence>
      <motion.div
        role="alert"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="flex items-center gap-3 px-4 py-3 bg-neo-red/90 border-3 border-neo-black rounded-neo shadow-hard-sm text-neo-black font-bold text-sm"
      >
        <AlertTriangle className="w-5 h-5 shrink-0" />
        <span className="flex-1">{t(ERROR_KEYS[error])}</span>
        {showRetry && (
          <button
            onClick={onRetry}
            aria-label={t('common.retry')}
            className="flex items-center gap-1 px-3 py-1 bg-neo-white rounded-neo border-2 border-neo-black text-xs font-black uppercase hover:bg-neo-cream active:translate-y-0.5 transition-all focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-neo-lime"
          >
            <RefreshCw className="w-3 h-3" />
            {t('common.retry')}
          </button>
        )}
        <button
          onClick={onDismiss}
          aria-label={t('common.dismiss')}
          className="w-7 h-7 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full hover:bg-neo-black/10 transition-colors focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-neo-lime"
        >
          <X className="w-4 h-4" />
        </button>
      </motion.div>
    </AnimatePresence>
  );
};
