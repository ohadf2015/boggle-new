'use client';

import React, { useState } from 'react';
import { AdaptiveMotion, AdaptiveAnimatePresence } from '@/components/motion/AdaptiveMotion';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsDesktop } from '@/hooks/useMediaQuery';

interface CollapsibleSectionProps {
  title?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  onToggle?: (isExpanded: boolean) => void;
  badge?: string | number;
  /** One-line summary shown when collapsed — tells the player what's inside without opening */
  summary?: string;
  variant?: 'primary' | 'secondary' | 'tertiary';
  className?: string;
  headerClassName?: string;
  contentClassName?: string;
}

const variantStyles = {
  primary: {
    header: 'bg-neo-navy text-white border-neo-cyan',
    content: 'bg-neo-navy/50',
    badge: 'bg-neo-cyan text-neo-black',
  },
  secondary: {
    header: 'bg-neo-cream text-neo-black border-neo-black',
    content: 'bg-neo-navy',
    badge: 'bg-neo-purple text-neo-white',
  },
  tertiary: {
    header: 'bg-neo-gray text-neo-white border-neo-black/30',
    content: 'bg-neo-navy',
    badge: 'bg-muted-foreground text-white',
  },
};

/**
 * Reusable Collapsible Section Component
 * Neo-Brutalist style with smooth animations
 * Supports ARIA attributes for accessibility
 * On desktop (>=768px), sections are collapsed by default regardless of defaultExpanded prop
 */
const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  title,
  icon,
  children,
  defaultExpanded = false,
  onToggle,
  badge,
  summary,
  variant = 'secondary',
  className,
  headerClassName,
  contentClassName,
}) => {
  const isDesktop = useIsDesktop();

  // On desktop, sections should be collapsed by default regardless of defaultExpanded
  const [isExpanded, setIsExpanded] = useState(() => {
    return isDesktop ? false : defaultExpanded;
  });
  const styles = variantStyles[variant];

  const handleToggle = () => {
    const newState = !isExpanded;
    setIsExpanded(newState);
    onToggle?.(newState);
  };

  const contentId = `collapsible-content-${(title ?? '').replace(/\s+/g, '-').toLowerCase()}`;

  return (
    <div className={cn('rounded-neo border-2 border-neo-black overflow-hidden', className)}>
      {/* Header Button */}
      <button
        type="button"
        onClick={handleToggle}
        aria-expanded={isExpanded}
        aria-controls={contentId}
        className={cn(
          'w-full flex items-center justify-between gap-2 p-2.5 sm:p-3',
          'font-bold text-sm uppercase tracking-wide',
          'border-b-2 transition-all duration-150',
          'hover:brightness-95 focus:outline-hidden focus:ring-2 focus:ring-neo-cyan focus:ring-offset-1',
          'min-h-[44px]', // WCAG touch target
          styles.header,
          isExpanded ? 'border-neo-black' : 'border-transparent',
          headerClassName
        )}
      >
        <div className="flex items-center gap-2">
          {icon && <span className="shrink-0">{icon}</span>}
          <span>{title}</span>
          {badge !== undefined && (
            <span className={cn(
              'px-1.5 py-0.5 text-xs font-black rounded-neo border border-neo-black',
              styles.badge
            )}>
              {badge}
            </span>
          )}
        </div>
        <AdaptiveMotion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="w-5 h-5 shrink-0" />
        </AdaptiveMotion.div>
      </button>

      {/* Summary teaser — visible only when collapsed, entices player to expand */}
      {summary && !isExpanded && (
        <button
          type="button"
          onClick={handleToggle}
          className={cn(
            'w-full px-3 py-2 text-xs text-slate-300 border-t border-white/5 text-start',
            'bg-linear-to-r from-neo-cyan/4 via-transparent to-neo-pink/4',
            'hover:from-neo-cyan/8 hover:to-neo-pink/8 transition-colors cursor-pointer',
            styles.content,
          )}
        >
          <span className="opacity-70">{summary}</span>
          <span className="text-neo-cyan/60 ms-1.5 text-[10px] font-black uppercase tracking-widest">
            {'\u2022\u2022\u2022'}
          </span>
        </button>
      )}

      {/* Collapsible Content */}
      <AdaptiveAnimatePresence initial={false}>
        {isExpanded && (
          <AdaptiveMotion.div
            id={contentId}
            role="region"
            aria-labelledby={`${contentId}-header`}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className={cn('p-3', styles.content, contentClassName)}>
              {children}
            </div>
          </AdaptiveMotion.div>
        )}
      </AdaptiveAnimatePresence>
    </div>
  );
};

export default CollapsibleSection;
