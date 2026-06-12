'use client';

/**
 * One-time "pick your style" modal. Wraps StylePicker with a title/subtitle and
 * a secondary "keep default" action. Persisting the choice is StylePicker's job
 * (its confirm calls setStyle); this shell only owns presentation + dismissal.
 */

import React, { useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { StylePicker } from './StylePicker';
import type { PlayerStyleKey } from '@/lib/playerStyle/styles';

export interface PlayerStyleModalProps {
  isOpen: boolean;
  /** Called when the user confirms a style (key) or keeps default (no arg). */
  onDismiss: (chosen?: PlayerStyleKey) => void;
}

export function PlayerStyleModal({ isOpen, onDismiss }: PlayerStyleModalProps) {
  const { t } = useLanguage();

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDismiss();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onDismiss]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={t('playerStyle.popup.title')}
      onClick={() => onDismiss()}
    >
      <div
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-neo border-neo-thick border-neo-black bg-neo-navy p-5 shadow-hard-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-1 text-center font-neo-display text-2xl font-bold text-neo-cream">
          {t('playerStyle.popup.title')}
        </h2>
        <p className="mb-4 text-center font-neo-body text-sm text-neo-cream/70">
          {t('playerStyle.popup.subtitle')}
        </p>

        <StylePicker
          confirmLabelKey="playerStyle.popup.save"
          onConfirm={(key) => onDismiss(key)}
        />

        <button
          type="button"
          onClick={() => onDismiss()}
          className="mx-auto mt-3 block font-neo-body text-xs text-neo-cream/60 underline hover:text-neo-cream"
        >
          {t('playerStyle.popup.keepDefault')}
        </button>
      </div>
    </div>
  );
}

export default PlayerStyleModal;
