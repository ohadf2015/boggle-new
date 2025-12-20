'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaChevronDown } from 'react-icons/fa';
import { cn } from '../../lib/utils';

interface CollapsibleSectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  className?: string;
}

/**
 * Collapsible accordion section with Neo-Brutalist styling.
 * Used for organizing content in dense views like settings panels.
 */
export function CollapsibleSection({
  title,
  children,
  defaultOpen = false,
  icon,
  badge,
  className,
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={cn('border-4 border-neo-black rounded-neo-lg overflow-hidden', className)}>
      {/* Header - clickable */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'w-full flex items-center justify-between px-4 py-3',
          'bg-neo-gray text-neo-white',
          'hover:bg-neo-navy-light transition-colors duration-100',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-cyan focus-visible:ring-inset'
        )}
      >
        <div className="flex items-center gap-3">
          {icon && <span className="text-neo-yellow">{icon}</span>}
          <span className="font-bold uppercase tracking-wide">{title}</span>
          {badge}
        </div>
        <motion.span
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <FaChevronDown className="text-neo-cyan" />
        </motion.span>
      </button>

      {/* Content - animated */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-4 bg-neo-cream text-neo-black border-t-4 border-neo-black">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default CollapsibleSection;
