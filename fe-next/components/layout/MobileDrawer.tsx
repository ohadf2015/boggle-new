'use client';

import React from 'react';
import { Drawer } from 'vaul';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  /** Height variant: 'auto' fits content, 'half' is 50vh, 'full' is nearly full screen */
  height?: 'auto' | 'half' | 'full';
  className?: string;
  /** Accessible label for the close button (should be translated) */
  closeLabel?: string;
}

const snapPointsMap = {
  auto: undefined,
  half: [0.5],
  full: [0.95],
};

/**
 * Mobile-friendly slide-up drawer for secondary content.
 * Uses Neo-Brutalist styling with hard shadows and thick borders.
 * Powered by vaul — supports native swipe-to-dismiss gesture.
 */
export function MobileDrawer({
  isOpen,
  onClose,
  title,
  children,
  height = 'half',
  className,
  closeLabel,
}: MobileDrawerProps) {
  const heightClasses = {
    auto: 'max-h-[85vh]',
    half: 'h-[50vh]',
    full: 'h-[calc(100vh-48px)]',
  };

  const snapPoints = snapPointsMap[height];

  return (
    <Drawer.Root
      open={isOpen}
      onOpenChange={(open) => { if (!open) onClose(); }}
      snapPoints={snapPoints}
    >
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-55 bg-neo-black/50" />
        <Drawer.Content
          className={cn(
            'mobile-drawer',
            heightClasses[height],
            'overflow-hidden flex flex-col z-[60] fixed inset-x-0 bottom-0 bg-neo-cream rounded-t-2xl border-t-4 border-x-4 border-neo-black outline-hidden',
            className,
          )}
        >
          {/* Drag handle */}
          <div className="mx-auto mt-2 mb-1 h-1.5 w-12 rounded-full bg-neo-black/20" />

          {/* Header */}
          {title && (
            <div className="flex items-center justify-between px-4 py-3 border-b-4 border-neo-black bg-neo-lime text-neo-black">
              <Drawer.Title className="font-bold uppercase tracking-wide text-neo-black">
                {title}
              </Drawer.Title>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                aria-label={closeLabel || 'Close'}
                className="h-8 w-8 border-2 border-neo-black text-neo-black hover:bg-neo-black/10"
              >
                <X className="text-neo-black" />
              </Button>
            </div>
          )}

          {/* Content */}
          <div className="flex-1 overflow-auto p-4">
            {children}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

export default MobileDrawer;
