'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Search, Inbox, FolderOpen, Frown, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EnhancedButton } from './EnhancedButton';

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
  /** Primary action button */
  action?: {
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
    <motion.div
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
      {/* Icon Container */}
      <motion.div
        className={cn(
          'relative flex items-center justify-center rounded-neo-lg border-4 border-neo-black shadow-hard mb-6',
          compact ? 'w-16 h-16' : 'w-24 h-24',
          'bg-gradient-to-br from-neo-lime to-neo-lime-hover'
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
            <motion.div
              className="absolute -top-2 -right-2 w-4 h-4 bg-neo-pink rounded-full border-2 border-neo-black"
              animate={{ scale: [1, 1.2, 1], opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            <motion.div
              className="absolute -bottom-1 -left-2 w-3 h-3 bg-neo-cyan rounded-full border-2 border-neo-black"
              animate={{ scale: [1, 1.3, 1], opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
            />
          </>
        )}
      </motion.div>

      {/* Title */}
      <motion.h3
        className={cn(
          'font-black text-neo-black dark:text-neo-white uppercase tracking-tight',
          compact ? 'text-lg' : 'text-xl'
        )}
        variants={reduceMotion ? {} : itemVariants}
      >
        {title}
      </motion.h3>

      {/* Description */}
      {description && (
        <motion.p
          className={cn(
            'font-medium text-neo-black/70 dark:text-neo-white/70 max-w-sm',
            compact ? 'text-sm mt-2' : 'text-base mt-3'
          )}
          variants={reduceMotion ? {} : itemVariants}
        >
          {description}
        </motion.p>
      )}

      {/* Action Button */}
      {action && (
        <motion.div
          className="mt-6"
          variants={reduceMotion ? {} : itemVariants}
        >
          <EnhancedButton
            onClick={action.onClick}
            variant={action.variant === 'secondary' ? 'secondary' : 'default'}
            size={compact ? 'sm' : 'default'}
            animation="pop"
          >
            {action.label}
          </EnhancedButton>
        </motion.div>
      )}

      {/* Secondary Action */}
      {secondaryAction && (
        <motion.button
          className={cn(
            'mt-3 text-sm font-bold text-neo-cyan hover:text-neo-cyan-light underline underline-offset-4 decoration-2 transition-colors',
            'focus:outline-none focus:ring-2 focus:ring-neo-cyan focus:ring-offset-2 rounded-neo px-2 py-1'
          )}
          onClick={secondaryAction.onClick}
          variants={reduceMotion ? {} : itemVariants}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {secondaryAction.label}
        </motion.button>
      )}
    </motion.div>
  );
};

// Pre-configured empty states for common scenarios
export const EmptySearchResults: React.FC<{
  searchTerm?: string;
  onClearSearch?: () => void;
  className?: string;
}> = ({ searchTerm, onClearSearch, className }) => (
  <EnhancedEmptyState
    title="No results found"
    description={
      searchTerm
        ? `We couldn't find anything matching "${searchTerm}". Try different keywords.`
        : 'Try adjusting your search or filters to find what you\'re looking for.'
    }
    icon="search"
    action={
      onClearSearch
        ? {
            label: 'Clear Search',
            onClick: onClearSearch,
          }
        : undefined
    }
    className={className}
  />
);

export const EmptyInbox: React.FC<{
  message?: string;
  onRefresh?: () => void;
  className?: string;
}> = ({ message = 'You\'re all caught up!', onRefresh, className }) => (
  <EnhancedEmptyState
    title="Nothing to see here"
    description={message}
    icon="inbox"
    action={
      onRefresh
        ? {
            label: 'Refresh',
            onClick: onRefresh,
          }
        : undefined
    }
    className={className}
  />
);

export const EmptyContent: React.FC<{
  title?: string;
  description?: string;
  onCreate?: () => void;
  createLabel?: string;
  className?: string;
}> = ({
  title = 'No content yet',
  description = 'Get started by creating your first item.',
  onCreate,
  createLabel = 'Create New',
  className,
}) => (
  <EnhancedEmptyState
    title={title}
    description={description}
    icon="folder"
    action={
      onCreate
        ? {
            label: createLabel,
            onClick: onCreate,
            variant: 'primary',
          }
        : undefined
    }
    className={className}
  />
);

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
    icon="sad"
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

export const SuccessState: React.FC<{
  title?: string;
  description?: string;
  onContinue?: () => void;
  continueLabel?: string;
  className?: string;
}> = ({
  title = 'All done!',
  description = 'Your action was completed successfully.',
  onContinue,
  continueLabel = 'Continue',
  className,
}) => (
  <EnhancedEmptyState
    title={title}
    description={description}
    icon="sparkles"
    action={
      onContinue
        ? {
            label: continueLabel,
            onClick: onContinue,
            variant: 'primary',
          }
        : undefined
    }
    className={className}
  />
);
