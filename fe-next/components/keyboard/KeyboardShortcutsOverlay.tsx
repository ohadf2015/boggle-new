'use client';

import React, { useEffect, useRef } from 'react';
import { X, Keyboard, MousePointer, Type } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KeyboardShortcutsOverlayProps {
  /** Whether the overlay is open */
  isOpen: boolean;
  /** Callback to close the overlay */
  onClose: () => void;
  /** Translation function */
  t: (key: string) => string;
}

/**
 * KeyboardShortcutsOverlay - Full keyboard shortcuts reference modal
 *
 * Shows all available keyboard shortcuts grouped by category.
 * Triggered by pressing '?' key or clicking help button.
 * Neo-Brutalist design with accessible focus management.
 */
export function KeyboardShortcutsOverlay({
  isOpen,
  onClose,
  t,
}: KeyboardShortcutsOverlayProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Focus close button when overlay opens
  useEffect(() => {
    if (!isOpen) return;

    // Small delay to ensure animation has started
    const timer = setTimeout(() => {
      closeButtonRef.current?.focus();
    }, 100);
    return () => clearTimeout(timer);
  }, [isOpen]);

  // Trap focus within the overlay
  useEffect(() => {
    if (!isOpen) return;

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      const focusableElements = overlayRef.current?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );

      if (!focusableElements || focusableElements.length === 0) return;

      const firstElement = focusableElements[0] as HTMLElement;
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    document.addEventListener('keydown', handleTabKey);
    return () => document.removeEventListener('keydown', handleTabKey);
  }, [isOpen]);

  // Close on backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <>
      {isOpen && (
        <div
          ref={overlayRef}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-neo-black/80 backdrop-blur-xs animate-in fade-in-0 duration-200"
          onClick={handleBackdropClick}
          role="dialog"
          aria-modal="true"
          aria-labelledby="keyboard-shortcuts-title"
        >
          <div
            className={cn(
              'relative w-full max-w-md',
              'animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-2 duration-200',
              'bg-neo-navy text-neo-white',
              'border-4 border-neo-black',
              'rounded-neo-lg shadow-hard-xl',
              'overflow-hidden'
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b-4 border-neo-black bg-neo-pink text-neo-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-neo-lime text-neo-black rounded-neo border-2 border-neo-black flex items-center justify-center">
                  <Keyboard className="w-6 h-6" />
                </div>
                <h2
                  id="keyboard-shortcuts-title"
                  className="font-black text-lg uppercase tracking-wide"
                >
                  {t('keyboardShortcuts.title')}
                </h2>
              </div>
              <button
                ref={closeButtonRef}
                onClick={onClose}
                className={cn(
                  'w-11 h-11 min-w-[44px] min-h-[44px]',
                  'flex items-center justify-center',
                  'bg-white/20 hover:bg-white/30',
                  'rounded-neo border-2 border-white/30',
                  'transition-colors',
                  'focus:outline-hidden focus:ring-2 focus:ring-neo-lime focus:ring-offset-2 focus:ring-offset-neo-pink'
                )}
                aria-label="Close keyboard shortcuts"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-5 max-h-[60vh] overflow-y-auto">
              {/* Word Building Section */}
              <ShortcutSection
                icon={<Type className="w-5 h-5" />}
                title={t('keyboardShortcuts.wordBuilding')}
              >
                <ShortcutRow
                  keys={[t('keyboardShortcuts.type')]}
                  description={t('keyboardShortcuts.typeDesc')}
                />
                <ShortcutRow
                  keys={[t('keyboardShortcuts.enter')]}
                  description={t('keyboardShortcuts.enterDesc')}
                />
                <ShortcutRow
                  keys={[t('keyboardShortcuts.escape')]}
                  description={t('keyboardShortcuts.escapeDesc')}
                />
                <ShortcutRow
                  keys={[t('keyboardShortcuts.backspace')]}
                  description={t('keyboardShortcuts.backspaceDesc')}
                />
              </ShortcutSection>

              {/* Grid Navigation Section */}
              <ShortcutSection
                icon={<Keyboard className="w-5 h-5" />}
                title={t('keyboardShortcuts.gridNavigation')}
              >
                <ShortcutRow
                  keys={[t('keyboardShortcuts.arrows')]}
                  description={t('keyboardShortcuts.arrowsDesc')}
                />
                <ShortcutRow
                  keys={[t('keyboardShortcuts.space')]}
                  description={t('keyboardShortcuts.spaceDesc')}
                />
              </ShortcutSection>

              {/* Desktop Shortcuts Section */}
              <ShortcutSection
                icon={<MousePointer className="w-5 h-5" />}
                title={t('keyboardShortcuts.desktopShortcuts')}
              >
                <ShortcutRow
                  keys={[t('keyboardShortcuts.doubleClick')]}
                  description={t('keyboardShortcuts.doubleClickDesc')}
                />
                <ShortcutRow
                  keys={[t('keyboardShortcuts.rightClick')]}
                  description={t('keyboardShortcuts.rightClickDesc')}
                />
              </ShortcutSection>

              {/* Pro Tip */}
              <div className={cn(
                'p-3 rounded-neo',
                'bg-neo-cyan/20 border-2 border-neo-cyan/40',
                'text-sm'
              )}>
                <span className="font-bold text-neo-cyan">TIP: </span>
                <span className="text-neo-white">
                  {t('keyboardShortcuts.tip')}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ==================== Sub-components ====================

interface ShortcutSectionProps {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}

function ShortcutSection({ icon, title, children }: ShortcutSectionProps) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <div className="text-neo-lime">{icon}</div>
        <h3 className="font-black text-sm uppercase tracking-wide text-neo-lime">
          {title}
        </h3>
      </div>
      <div className="space-y-2 ps-7">{children}</div>
    </div>
  );
}

interface ShortcutRowProps {
  keys: string[];
  description: string;
}

function ShortcutRow({ keys, description }: ShortcutRowProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1 shrink-0">
        {keys.map((key, index) => (
          <kbd
            key={`key-${index}-${key}`}
            className={cn(
              'px-2 py-1',
              'bg-neo-cyan text-neo-black',
              'rounded border-2 border-neo-black',
              'font-mono font-bold text-xs',
              'shadow-hard-sm',
              'min-w-[32px] text-center'
            )}
          >
            {key}
          </kbd>
        ))}
      </div>
      <span className="text-sm text-neo-white">{description}</span>
    </div>
  );
}

export default KeyboardShortcutsOverlay;
