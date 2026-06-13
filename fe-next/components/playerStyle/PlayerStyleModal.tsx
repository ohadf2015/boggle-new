'use client';

/**
 * One-time "pick your style" modal. Wraps StylePicker with a title/subtitle and
 * a secondary "keep default" action. Persisting the choice is StylePicker's job
 * (its confirm calls setStyle); this shell only owns presentation + dismissal.
 */

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
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
  // Portal target is only known client-side; gate on mount to stay SSR-safe.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDismiss();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onDismiss]);

  // Lock body scroll while open: the page sliding behind the translucent
  // backdrop is a touch-repaint flicker source on its own.
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  if (!isOpen || !mounted) return null;

  // Portal to <body>: the profile card mounts this inside a framer-motion
  // m.div whose `transform` would otherwise become the containing block for
  // this `position: fixed` overlay, dragging it on scroll (flicker).
  return createPortal(
    <div
      className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/70 p-4 pb-[calc(1rem+var(--admob-banner-height,0px))]"
      role="dialog"
      aria-modal="true"
      aria-label={t('playerStyle.popup.title')}
      onClick={() => onDismiss()}
    >
      <div
        className="relative flex max-h-[90vh] w-full max-w-md flex-col rounded-neo border-neo-thick border-neo-black bg-neo-navy p-5 shadow-hard-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={() => onDismiss()}
          aria-label={t('common.close')}
          className="absolute end-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-neo border-neo border-neo-black bg-neo-navy-light text-neo-cream shadow-hard-sm transition-transform hover:-translate-y-0.5 active:translate-y-0"
        >
          <X size={18} strokeWidth={3} />
        </button>
        <div className="shrink-0">
          <h2 className="mb-1 px-10 text-center font-neo-display text-2xl font-bold text-neo-cream">
            {t('playerStyle.popup.title')}
          </h2>
          <p className="mb-4 text-center font-neo-body text-sm text-neo-cream/70">
            {t('playerStyle.popup.subtitle')}
          </p>
        </div>

        <StylePicker
          confirmLabelKey="playerStyle.popup.save"
          onConfirm={(key) => onDismiss(key)}
          footerExtra={
            <button
              type="button"
              onClick={() => onDismiss()}
              className="mx-auto block font-neo-body text-xs text-neo-cream/60 underline hover:text-neo-cream"
            >
              {t('playerStyle.popup.keepDefault')}
            </button>
          }
        />
      </div>
    </div>,
    document.body,
  );
}

export default PlayerStyleModal;
