'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
}

/**
 * Mobile-friendly slide-up drawer for secondary content.
 * Uses Neo-Brutalist styling with hard shadows and thick borders.
 */
export function MobileDrawer({
  isOpen,
  onClose,
  title,
  children,
  height = 'half',
  className,
}: MobileDrawerProps) {
  const heightClasses = {
    auto: 'max-h-[85vh]',
    half: 'h-[50vh]',
    full: 'h-[calc(100vh-48px)]',
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[55] bg-neo-black/50"
          />

          {/* Drawer */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={cn(
              'mobile-drawer',
              heightClasses[height],
              'overflow-hidden flex flex-col z-[60]',
              className
            )}
          >
            {/* Header */}
            {title && (
              <div className="flex items-center justify-between px-4 py-3 border-b-4 border-neo-black bg-neo-yellow text-neo-black">
                <h3 className="font-bold uppercase tracking-wide text-neo-black">
                  {title}
                </h3>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="h-8 w-8 border-2"
                >
                  <X />
                </Button>
              </div>
            )}

            {/* Content */}
            <div className="flex-1 overflow-auto p-4">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default MobileDrawer;
