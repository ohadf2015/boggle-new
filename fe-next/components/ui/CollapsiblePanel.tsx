'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface CollapsiblePanelProps {
  /** The label/title shown in the header button */
  label: string;
  /** Optional short label for mobile (shown instead of label on small screens) */
  mobileLabel?: string;
  /** Icon component to show before the label */
  icon?: LucideIcon;
  /** Whether the panel is currently expanded */
  isOpen: boolean;
  /** Callback when the header is clicked */
  onToggle: () => void;
  /** Optional count/badge shown after the label */
  count?: number | string;
  /** Panel content */
  children: React.ReactNode;
  /** Additional class name for the wrapper */
  className?: string;
  /** Additional class name for the header button */
  headerClassName?: string;
  /** Additional class name for the content area */
  contentClassName?: string;
  /** Button variant styling */
  variant?: 'default' | 'highlight' | 'subtle';
  /** Whether to use a bottom margin after the panel */
  noMargin?: boolean;
}

/**
 * CollapsiblePanel - A reusable accordion-style collapsible section
 *
 * Provides consistent styling and animation for expandable sections
 * throughout the app (player cards, results, settings, etc.)
 *
 * @example
 * ```tsx
 * const [showWords, setShowWords] = useState(false);
 *
 * <CollapsiblePanel
 *   label="View All Words"
 *   mobileLabel="Words"
 *   icon={Hash}
 *   isOpen={showWords}
 *   onToggle={() => setShowWords(!showWords)}
 *   count={words.length}
 *   variant="default"
 * >
 *   <WordsList words={words} />
 * </CollapsiblePanel>
 * ```
 */
export function CollapsiblePanel({
  label,
  mobileLabel,
  icon: Icon,
  isOpen,
  onToggle,
  count,
  children,
  className,
  headerClassName,
  contentClassName,
  variant = 'default',
  noMargin = false,
}: CollapsiblePanelProps) {
  const variantStyles = {
    default: 'border-white/20 bg-white/5 hover:bg-white/10 text-white',
    highlight: 'border-neo-cyan/50 bg-neo-cyan/10 hover:bg-neo-cyan/20 text-white',
    subtle: 'border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200',
  };

  return (
    <div className={cn(!noMargin && 'mb-1.5 sm:mb-2', className)}>
      {/* Header Button */}
      <button
        onClick={onToggle}
        aria-expanded={isOpen}
        className={cn(
          'w-full flex items-center justify-between',
          'p-1.5 sm:p-2 rounded-neo',
          'text-xs sm:text-sm font-bold uppercase',
          'border sm:border-2 transition-colors',
          variantStyles[variant],
          headerClassName
        )}
      >
        <span className="flex items-center gap-1.5 sm:gap-2">
          {Icon && <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
          {mobileLabel ? (
            <>
              <span className="hidden sm:inline">{label}</span>
              <span className="sm:hidden">{mobileLabel}</span>
            </>
          ) : (
            <span>{label}</span>
          )}
          {count !== undefined && (
            <span className="opacity-60">({count})</span>
          )}
        </span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5" />
        </motion.div>
      </button>

      {/* Expandable Content */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className={cn('mt-1.5 sm:mt-2', contentClassName)}>
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default CollapsiblePanel;
