'use client';

/**
 * Unified Collapsible Component
 *
 * Consolidates all collapsible/accordion variants into a single, flexible component.
 *
 * Replaces:
 * - CollapsibleSection (components/ui/CollapsibleSection.tsx)
 * - CollapsiblePanel (components/ui/CollapsiblePanel.tsx)
 *
 * Key Features:
 * - Controlled vs uncontrolled modes
 * - Desktop detection (opt-in)
 * - Multiple variant styles
 * - Badge vs count display
 * - Bordered vs borderless wrapper
 * - Mobile-responsive labels
 * - Smooth animations
 * - Full accessibility (ARIA)
 *
 * @module components/ui/Collapsible
 */

import React, { useState, useEffect } from 'react';
import { AdaptiveMotion, AdaptiveAnimatePresence } from '@/components/motion/AdaptiveMotion';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsDesktop } from '@/hooks/useMediaQuery';

// ==================== Types ====================

export type CollapsibleVariant =
  | 'primary'      // Dark header with cyan accent
  | 'secondary'    // Cream header with purple badge
  | 'tertiary'     // Light gray header
  | 'default'      // Transparent with white text
  | 'highlight'    // Cyan accent background
  | 'subtle';      // Light background for light mode

export type CollapsibleBadgeStyle =
  | 'badge'   // Styled badge component (CollapsibleSection style)
  | 'count';  // Inline count text (CollapsiblePanel style)

export interface CollapsibleProps {
  /** The label/title shown in the header button */
  label: string;

  /** Optional short label for mobile (shown instead of label on small screens) */
  mobileLabel?: string;

  /** Icon component or element to show before the label */
  icon?: React.ElementType | React.ReactNode;

  /** Panel content */
  children: React.ReactNode;

  /** Visual variant */
  variant?: CollapsibleVariant;

  /** How to display the badge/count */
  badgeStyle?: CollapsibleBadgeStyle;

  /** Badge/count value */
  badge?: string | number;

  /** Whether to wrap in a bordered container */
  bordered?: boolean;

  /** Whether to use desktop detection (collapses on desktop if true) */
  useDesktopDetection?: boolean;

  // Controlled mode props
  /** Whether the panel is currently expanded (controlled mode) */
  isOpen?: boolean;

  /** Callback when the header is clicked (controlled mode) */
  onToggle?: (isOpen: boolean) => void;

  // Uncontrolled mode props
  /** Default expanded state (uncontrolled mode) */
  defaultExpanded?: boolean;

  /** Additional styling props */
  className?: string;
  headerClassName?: string;
  contentClassName?: string;
  noMargin?: boolean;
}

// ==================== Variant Configurations ====================

const VARIANT_STYLES: Record<CollapsibleVariant, { header: string; content: string; badge: string }> = {
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
  default: {
    header: 'border-white/20 bg-white/5 hover:bg-white/10 text-white',
    content: '',
    badge: 'bg-white/20 text-white',
  },
  highlight: {
    header: 'border-neo-cyan/50 bg-neo-cyan/10 hover:bg-neo-cyan/20 text-white',
    content: '',
    badge: 'bg-neo-cyan/30 text-white',
  },
  subtle: {
    header: 'border-neo-gray bg-neo-navy hover:bg-neo-gray text-neo-white',
    content: '',
    badge: 'bg-neo-gray text-neo-white',
  },
};

// ==================== Component ====================

/**
 * Unified Collapsible component for accordion-style expandable sections
 *
 * @example
 * // Controlled mode (CollapsiblePanel style)
 * <Collapsible
 *   label="View All Words"
 *   mobileLabel="Words"
 *   icon={Hash}
 *   isOpen={showWords}
 *   onToggle={(open) => setShowWords(open)}
 *   badge={words.length}
 *   badgeStyle="count"
 *   variant="default"
 * >
 *   <WordsList words={words} />
 * </Collapsible>
 *
 * @example
 * // Uncontrolled mode with desktop detection (CollapsibleSection style)
 * <Collapsible
 *   label="Game History"
 *   icon={<Trophy />}
 *   defaultExpanded={true}
 *   useDesktopDetection={true}
 *   badge={5}
 *   badgeStyle="badge"
 *   variant="secondary"
 *   bordered={true}
 * >
 *   <GameHistoryList />
 * </Collapsible>
 */
export function Collapsible({
  label,
  mobileLabel,
  icon,
  children,
  variant = 'default',
  badgeStyle = 'count',
  badge,
  bordered = false,
  useDesktopDetection = false,
  isOpen: controlledIsOpen,
  onToggle,
  defaultExpanded = false,
  className,
  headerClassName,
  contentClassName,
  noMargin = false,
}: CollapsibleProps) {
  const isDesktop = useIsDesktop();

  // Determine if this is controlled or uncontrolled mode
  const isControlled = controlledIsOpen !== undefined && onToggle !== undefined;

  // Uncontrolled state
  const [uncontrolledIsOpen, setUncontrolledIsOpen] = useState(() => {
    // Apply desktop detection logic only in uncontrolled mode
    if (useDesktopDetection && isDesktop) {
      return false;
    }
    return defaultExpanded;
  });

  // Update uncontrolled state when desktop status changes (only if using desktop detection)
  useEffect(() => {
    if (!isControlled && useDesktopDetection) {
      setUncontrolledIsOpen(isDesktop ? false : defaultExpanded);
    }
  }, [isDesktop, useDesktopDetection, defaultExpanded, isControlled]);

  // Get current open state (controlled or uncontrolled)
  const isOpen = isControlled ? controlledIsOpen : uncontrolledIsOpen;

  // Handle toggle
  const handleToggle = () => {
    const newState = !isOpen;

    if (isControlled) {
      onToggle?.(newState);
    } else {
      setUncontrolledIsOpen(newState);
      onToggle?.(newState);
    }
  };

  const styles = VARIANT_STYLES[variant];
  const contentId = `collapsible-content-${label.replace(/\s+/g, '-').toLowerCase()}`;

  // Render icon (component or element)
  const renderIcon = () => {
    if (!icon) return null;

    // Check if icon is already a React element
    const isReactElement = React.isValidElement(icon);

    // Check if icon is a component (function or object with $$typeof - handles forwardRef)
    const isIconComponent = typeof icon === 'function' ||
      (typeof icon === 'object' && icon !== null && '$$typeof' in icon);

    if (isIconComponent && !isReactElement) {
      const IconComponent = icon as React.ComponentType<{ className?: string }>;
      return <IconComponent className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />;
    }

    return <span className="shrink-0">{icon as React.ReactNode}</span>;
  };

  // Render badge/count
  const renderBadge = () => {
    if (badge === undefined) return null;

    if (badgeStyle === 'badge') {
      // Styled badge (CollapsibleSection style)
      return (
        <span className={cn(
          'px-1.5 py-0.5 text-xs font-black rounded-neo border border-neo-black',
          styles.badge
        )}>
          {badge}
        </span>
      );
    }

    // Inline count (CollapsiblePanel style)
    return <span className="opacity-60">({badge})</span>;
  };

  // Header button content
  const headerContent = (
    <button
      onClick={handleToggle}
      aria-expanded={isOpen}
      aria-controls={contentId}
      className={cn(
        'w-full flex items-center justify-between',
        'font-bold uppercase tracking-wide transition-all duration-150',
        'hover:brightness-95 focus:outline-hidden focus:ring-2 focus:ring-neo-cyan focus:ring-offset-1',
        // Size variants based on bordered vs borderless
        bordered
          ? 'p-2.5 sm:p-3 text-sm min-h-[44px]'
          : 'p-1.5 sm:p-2 text-xs sm:text-sm',
        // Border styles
        bordered
          ? cn('border-b-2', isOpen ? 'border-neo-black' : 'border-transparent')
          : 'border sm:border-2 rounded-neo',
        styles.header,
        headerClassName
      )}
    >
      <div className="flex items-center gap-1.5 sm:gap-2">
        {renderIcon()}
        {mobileLabel ? (
          <>
            <span className="hidden sm:inline">{label}</span>
            <span className="sm:hidden">{mobileLabel}</span>
          </>
        ) : (
          <span>{label}</span>
        )}
        {renderBadge()}
      </div>
      <AdaptiveMotion.div
        animate={{ rotate: isOpen ? 180 : 0 }}
        transition={{ duration: 0.2 }}
      >
        <ChevronDown className={cn(
          'shrink-0',
          bordered ? 'w-5 h-5' : 'w-4 h-4 sm:w-5 sm:h-5'
        )} />
      </AdaptiveMotion.div>
    </button>
  );

  // Expandable content
  const expandableContent = (
    <AdaptiveAnimatePresence initial={false}>
      {isOpen && (
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
          <div className={cn(
            bordered
              ? cn('p-3', styles.content)
              : 'mt-1.5 sm:mt-2',
            contentClassName
          )}>
            {children}
          </div>
        </AdaptiveMotion.div>
      )}
    </AdaptiveAnimatePresence>
  );

  // Render with or without bordered wrapper
  if (bordered) {
    return (
      <div className={cn(
        'rounded-neo border-2 border-neo-black overflow-hidden',
        !noMargin && 'mb-1.5 sm:mb-2',
        className
      )}>
        {headerContent}
        {expandableContent}
      </div>
    );
  }

  return (
    <div className={cn(!noMargin && 'mb-1.5 sm:mb-2', className)}>
      {headerContent}
      {expandableContent}
    </div>
  );
}

export default Collapsible;
