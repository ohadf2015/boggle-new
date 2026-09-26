'use client';

import { useEffect, useId, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

export interface MpSheetProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  /** `bottom` sheet on phone (default) · `end` side panel (560px) on desktop. */
  side?: 'bottom' | 'end';
  /**
   * `slide` (default): the panel slides in from its edge. `static`: the panel
   * is painted where it rests from the first frame (the caller animates its
   * content instead) — nothing looking right after open sees it mid-flight.
   */
  entrance?: 'slide' | 'static';
  children: ReactNode;
  testId?: string;
}

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

/**
 * A solid `bg-neo-navy-light` panel over a 60% scrim. The scrim is static (no
 * fade, no blur — pitfall class 5 / anti-glassmorphism); only the panel slides
 * (transform only). Esc and scrim tap close; Tab is trapped in the panel.
 */
export function MpSheet({ open, onClose, title, side = 'bottom', entrance = 'slide', children, testId = 'mp-sheet' }: MpSheetProps) {
  const { t } = useLanguage();
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return undefined;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    const first = panel?.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? panel)?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (e.key !== 'Tab' || !panel) return;
      const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (items.length === 0) return;
      const firstEl = items[0];
      const lastEl = items[items.length - 1];
      const active = document.activeElement;
      if (!panel.contains(active)) {
        e.preventDefault();
        firstEl.focus();
      } else if (e.shiftKey && active === firstEl) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && active === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      previouslyFocused?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div data-testid={testId} className="fixed inset-0 z-50">
      <div data-testid="mp-sheet-scrim" aria-hidden="true" onClick={onClose} className="absolute inset-0 bg-neo-black/60" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        data-testid="mp-sheet-panel"
        data-side={side}
        className={cn(
          'absolute flex flex-col bg-neo-navy-light text-neo-white border-neo-black shadow-hard-lg outline-none',
          side === 'bottom'
            ? 'inset-x-0 bottom-0 max-h-[85%] rounded-t-neo-lg border-t-4 pb-[env(safe-area-inset-bottom)]'
            : 'inset-y-0 end-0 w-full max-w-[560px] border-s-4',
          entrance === 'slide' && (side === 'bottom' ? 'animate-mp-sheet-up' : 'animate-mp-sheet-in'),
        )}
      >
        <div className="flex items-center justify-between gap-2 px-4 py-3 border-b-2 border-neo-black">
          <h2 id={titleId} className="font-neo-display font-bold text-lg uppercase truncate">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('mpUi.shell.close')}
            className="inline-flex items-center justify-center w-11 h-11 rounded-neo border-2 border-neo-black bg-neo-navy text-neo-white"
          >
            <X aria-hidden="true" className="w-5 h-5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">{children}</div>
      </div>
    </div>
  );
}
