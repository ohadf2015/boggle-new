/**
 * Enhanced UI Components - LexiClash Design System
 * 
 * This module exports enhanced UI components with improved UX,
 * accessibility, and Neo-Brutalist styling.
 */

// Enhanced Button with loading states, haptic feedback, and animations
export { EnhancedButton, buttonVariants } from './EnhancedButton';
export type { EnhancedButtonProps } from './EnhancedButton';

// Enhanced Card with hover effects and interactive states
export {
  EnhancedCard,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  CardBadge,
} from './EnhancedCard';
export type { EnhancedCardProps } from './EnhancedCard';

// Enhanced Toast notifications
export { ToastContainer, showToast, toast } from './EnhancedToast';
export type { Toast, ToastType } from './EnhancedToast';

// Enhanced Loading states
export {
  LoadingSpinner,
  LoadingDots,
  LoadingPulse,
  ProgressBar,
  Skeleton,
  SkeletonCard,
  FullPageLoader,
  InlineLoader,
  ButtonLoader,
} from './EnhancedLoading';

// Enhanced Empty States
export {
  EnhancedEmptyState,
  EmptySearchResults,
  EmptyInbox,
  EmptyContent,
  ErrorState,
  SuccessState,
} from './EnhancedEmptyState';
export type { EnhancedEmptyStateProps } from './EnhancedEmptyState';

// New Enhanced Components v2
export { DecorativeCard } from './DecorativeCard';
export type { DecorativeCardProps } from './DecorativeCard';

export { GameModeIcon } from './GameModeIcon';
export type { GameModeIconProps } from './GameModeIcon';

export { TactileButton } from './TactileButton';
export type { TactileButtonProps } from './TactileButton';

// Legacy exports for backward compatibility
export { Button } from './button';
export { Card, CardContent as LegacyCardContent } from './card';
