import { cn } from "../../lib/utils";

/**
 * Skeleton - Loading placeholder component with Neo-Brutalist styling
 * Uses shimmer animation defined in globals.css
 *
 * Usage:
 * <Skeleton className="h-4 w-[200px]" />
 * <Skeleton variant="text" />
 * <Skeleton variant="avatar" />
 * <Skeleton variant="card" />
 */

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'text' | 'avatar' | 'card';
}

function Skeleton({
  className,
  variant = 'default',
  ...props
}: SkeletonProps) {
  const variantClasses = {
    default: 'skeleton',
    text: 'skeleton skeleton-text',
    avatar: 'skeleton skeleton-avatar',
    card: 'skeleton skeleton-card',
  };

  return (
    <div
      className={cn(variantClasses[variant], className)}
      aria-busy="true"
      aria-live="polite"
      {...props}
    />
  );
}

/**
 * SkeletonText - Multiple lines of skeleton text
 */
function SkeletonText({
  lines = 3,
  className,
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)} aria-busy="true" aria-live="polite">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          variant="text"
          className={cn(
            "h-4",
            // Last line is shorter for natural text appearance
            i === lines - 1 ? "w-3/4" : "w-full"
          )}
        />
      ))}
    </div>
  );
}

/**
 * SkeletonCard - Card-shaped skeleton with avatar and text
 */
function SkeletonCard({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex items-center space-x-4 p-4 border-3 border-neo-black rounded-neo-lg bg-neo-navy-light text-white",
        className
      )}
      aria-busy="true"
      aria-live="polite"
    >
      <Skeleton variant="avatar" />
      <div className="space-y-2 flex-1">
        <Skeleton variant="text" className="h-4 w-1/2" />
        <Skeleton variant="text" className="h-3 w-3/4" />
      </div>
    </div>
  );
}

/**
 * LeaderboardSkeleton - Skeleton for leaderboard entries
 */
function LeaderboardSkeleton({
  rows = 5,
  className,
}: {
  rows?: number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)} aria-busy="true" aria-label="Loading leaderboard">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 p-3 border-3 border-neo-black rounded-neo bg-neo-navy-light"
        >
          {/* Rank */}
          <Skeleton className="h-8 w-8 rounded-full" />
          {/* Avatar */}
          <Skeleton variant="avatar" className="h-10 w-10" />
          {/* Name and score */}
          <div className="flex-1 space-y-1">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-16" />
          </div>
          {/* Score */}
          <Skeleton className="h-6 w-12" />
        </div>
      ))}
    </div>
  );
}

/**
 * WordListSkeleton - Skeleton for word list during results
 */
function WordListSkeleton({
  items = 8,
  className,
}: {
  items?: number;
  className?: string;
}) {
  return (
    <div
      className={cn("flex flex-wrap gap-2", className)}
      aria-busy="true"
      aria-label="Loading words"
    >
      {Array.from({ length: items }).map((_, i) => (
        <Skeleton
          key={i}
          className="h-8 rounded-neo"
          style={{ width: `${60 + Math.random() * 40}px` }}
        />
      ))}
    </div>
  );
}

export {
  Skeleton,
  SkeletonText,
  SkeletonCard,
  LeaderboardSkeleton,
  WordListSkeleton,
};
