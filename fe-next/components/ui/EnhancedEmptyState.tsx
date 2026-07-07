'use client';

import React from 'react';
import { m } from 'framer-motion';
import { Search, Inbox, FolderOpen, Frown, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EnhancedButton } from './EnhancedButton';
import { Mascot, type MascotVariant } from './Mascot';

/**
 * Enhanced Empty State Component
 * 
 * Features:
 * - Multiple icon variants for different contexts
 * - Action button support
 * - Animation on mount
 * - Customizable content
 * - Dark mode support
 */

type EmptyIcon = 'search' | 'inbox' | 'folder' | 'sad' | 'sparkles' | React.ReactNode;

export interface EnhancedEmptyStateProps {
  /** Main title */
  title: string;
  /** Descriptive message */
  description?: string;
  /** Icon variant or custom icon */
  icon?: EmptyIcon;
  /**
   * Primary action — either a fully custom element (rendered as-is, for
   * bespoke button styling) or a {label, onClick} config rendered via the
   * standard EnhancedButton.
   */
  action?: React.ReactElement | {
    label: string;
    onClick: () => void;
    variant?: 'default' | 'primary' | 'secondary';
  };
  /** Secondary action (link style) */
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  /** Compact mode for smaller spaces */
  compact?: boolean;
  /** Reduce motion for accessibility */
  reduceMotion?: boolean;
  /** Custom className */
  className?: string;
  /** Animated mascot variant (preferred over the icon box when set) */
  mascotVariant?: MascotVariant;
}

const iconComponents = {
  search: Search,
  inbox: Inbox,
  folder: FolderOpen,
  sad: Frown,
  sparkles: Sparkles,
};

export const EnhancedEmptyState: React.FC<EnhancedEmptyStateProps> = ({
  title,
  description,
  icon = 'inbox',
  action,
  secondaryAction,
  compact = false,
  reduceMotion = false,
  className,
  mascotVariant,
}) => {
  const IconComponent = typeof icon === 'string' ? iconComponents[icon as keyof typeof iconComponents] : null;

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <m.div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        compact ? 'p-6' : 'p-8',
        className
      )}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      role="status"
      aria-live="polite"
    >
      {/* Icon or Mascot */}
      {mascotVariant ? (
        <m.div
          className="mb-6"
          variants={reduceMotion ? {} : itemVariants}
        >
          <Mascot
            variant={mascotVariant}
            size={compact ? 'xs' : 'md'}
            animated={!reduceMotion}
          />
        </m.div>
      ) : (
        <m.div
          className={cn(
            'relative flex items-center justify-center rounded-neo-lg border-4 border-neo-black shadow-hard mb-6',
            compact ? 'w-16 h-16' : 'w-24 h-24',
            'bg-linear-to-br from-neo-lime to-neo-lime-hover'
          )}
          variants={reduceMotion ? {} : itemVariants}
          whileHover={reduceMotion ? {} : { scale: 1.05, rotate: [-2, 2, 0] }}
          transition={{ type: 'spring', stiffness: 300 }}
        >
          {IconComponent ? (
            <IconComponent
              className={cn(
                'text-neo-black',
                compact ? 'w-8 h-8' : 'w-12 h-12'
              )}
              aria-hidden="true"
            />
          ) : (
            <div className={cn('text-neo-black', compact ? 'w-8 h-8' : 'w-12 h-12')}>
              {icon}
            </div>
          )}

          {/* Decorative sparkles */}
          {!reduceMotion && !compact && (
            <>
              <m.div
                className="absolute -top-2 -right-2 w-4 h-4 bg-neo-pink rounded-full border-2 border-neo-black"
                animate={{ scale: [1, 1.2, 1], opacity: [0.7, 1, 0.7] }}
                transition={{ type: 'tween', duration: 2, repeat: Infinity }}
              />
              <m.div
                className="absolute -bottom-1 -left-2 w-3 h-3 bg-neo-cyan rounded-full border-2 border-neo-black"
                animate={{ scale: [1, 1.3, 1], opacity: [0.7, 1, 0.7] }}
                transition={{ type: 'tween', duration: 2, repeat: Infinity, delay: 0.5 }}
              />
            </>
          )}
        </m.div>
      )}

      {/* Title */}
      <m.h3
        className={cn(
          'font-black text-neo-black dark:text-neo-white uppercase tracking-tight',
          compact ? 'text-lg' : 'text-xl'
        )}
        variants={reduceMotion ? {} : itemVariants}
      >
        {title}
      </m.h3>

      {/* Description */}
      {description && (
        <m.p
          className={cn(
            'font-medium text-neo-black/70 dark:text-neo-white max-w-sm',
            compact ? 'text-sm mt-2' : 'text-base mt-3'
          )}
          variants={reduceMotion ? {} : itemVariants}
        >
          {description}
        </m.p>
      )}

      {/* Action Button */}
      {action && (
        <m.div
          className="mt-6"
          variants={reduceMotion ? {} : itemVariants}
        >
          {React.isValidElement(action) ? (
            action
          ) : (
            <EnhancedButton
              onClick={action.onClick}
              variant={action.variant === 'secondary' ? 'secondary' : 'default'}
              size={compact ? 'sm' : 'default'}
              animation="pop"
            >
              {action.label}
            </EnhancedButton>
          )}
        </m.div>
      )}

      {/* Secondary Action */}
      {secondaryAction && (
        <m.button
          className={cn(
            'mt-3 text-sm font-bold text-neo-cyan hover:text-neo-cyan-light underline underline-offset-4 decoration-2 transition-colors',
            'focus:outline-hidden focus:ring-2 focus:ring-neo-cyan focus:ring-offset-2 rounded-neo px-2 py-1'
          )}
          onClick={secondaryAction.onClick}
          variants={reduceMotion ? {} : itemVariants}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {secondaryAction.label}
        </m.button>
      )}
    </m.div>
  );
};

// Pre-configured error state for common scenarios (the only one of this
// file's convenience wrappers with real call sites — the rest were unused
// and dropped).
export const ErrorState: React.FC<{
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}> = ({
  title = 'Something went wrong',
  description = 'We encountered an error while loading this content.',
  onRetry,
  className,
}) => (
  <EnhancedEmptyState
    title={title}
    description={description}
    mascotVariant="oops"
    action={
      onRetry
        ? {
            label: 'Try Again',
            onClick: onRetry,
            variant: 'secondary',
          }
        : undefined
    }
    className={className}
  />
);
