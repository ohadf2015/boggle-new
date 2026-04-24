/**
 * EducationSkeletons - Structural loading skeletons for education components
 *
 * These skeletons match the exact structure of their corresponding content
 * to prevent layout shift during loading. Uses neo-brutalist styling.
 */

import { cn } from '@/lib/utils';

// Base skeleton block component
interface SkeletonBlockProps {
  className?: string;
  'data-testid'?: string;
}

function SkeletonBlock({ className, 'data-testid': testId }: SkeletonBlockProps) {
  return (
    <div
      data-testid={testId}
      className={cn(
        'bg-neo-white/10 rounded',
        className
      )}
    />
  );
}

/**
 * LessonCardSkeleton - Matches LessonBuilder lesson card structure
 */
export function LessonCardSkeleton() {
  return (
    <div
      data-testid="lesson-card-skeleton"
      aria-busy="true"
      className="border-neo border-neo-black shadow-hard bg-neo-navy/80 rounded-neo animate-pulse flex flex-col"
    >
      {/* Header */}
      <div className="p-4 pb-3">
        {/* Title */}
        <SkeletonBlock
          data-testid="skeleton-title"
          className="h-6 w-3/4 mb-2"
        />
        {/* Description */}
        <SkeletonBlock
          data-testid="skeleton-description"
          className="h-4 w-1/2"
        />
      </div>

      {/* Content - Word list */}
      <div data-testid="skeleton-words" className="px-4 flex-1 space-y-2">
        <SkeletonBlock className="h-4 w-full" />
        <SkeletonBlock className="h-4 w-5/6" />
        <SkeletonBlock className="h-4 w-4/5" />
        <SkeletonBlock className="h-4 w-3/4" />
      </div>

      {/* Actions */}
      <div data-testid="skeleton-actions" className="p-4 pt-4 border-t border-neo-black/30 flex gap-2">
        <SkeletonBlock className="h-9 flex-1" />
        <SkeletonBlock className="h-9 w-9" />
        <SkeletonBlock className="h-9 w-9" />
      </div>
    </div>
  );
}

/**
 * ClassroomCardSkeleton - Matches ClassroomManager classroom card structure
 */
export function ClassroomCardSkeleton() {
  return (
    <div
      data-testid="classroom-card-skeleton"
      aria-busy="true"
      className="border-neo border-neo-black shadow-hard bg-neo-navy/80 rounded-neo animate-pulse"
    >
      {/* Header */}
      <div className="p-4 pb-3">
        {/* Name */}
        <SkeletonBlock
          data-testid="skeleton-name"
          className="h-6 w-2/3 mb-2"
        />
        {/* Language + members */}
        <SkeletonBlock className="h-4 w-1/3" />
      </div>

      {/* Content */}
      <div className="px-4 space-y-4">
        {/* Join code box */}
        <div
          data-testid="skeleton-join-code"
          className="bg-neo-black/30 border-2 border-neo-yellow/30 p-3 rounded-neo"
        >
          <SkeletonBlock className="h-3 w-16 mb-2" />
          <SkeletonBlock className="h-8 w-24" />
        </div>

        {/* View students button */}
        <SkeletonBlock className="h-9 w-full" />
      </div>

      {/* Actions */}
      <div data-testid="skeleton-actions" className="p-4 flex gap-2">
        <SkeletonBlock className="h-9 flex-1" />
        <SkeletonBlock className="h-9 w-9" />
      </div>
    </div>
  );
}

/**
 * MetricCardSkeleton - For dashboard metrics/stats cards
 */
export function MetricCardSkeleton() {
  return (
    <div
      data-testid="metric-card-skeleton"
      aria-busy="true"
      className="p-4 rounded-neo border-neo border-neo-black bg-neo-navy/50 shadow-hard-sm animate-pulse"
    >
      <div className="flex items-center gap-3">
        {/* Icon placeholder */}
        <SkeletonBlock className="w-10 h-10 rounded-full" />
        <div className="flex-1">
          {/* Label */}
          <SkeletonBlock
            data-testid="skeleton-label"
            className="h-3 w-16 mb-2"
          />
          {/* Value */}
          <SkeletonBlock
            data-testid="skeleton-value"
            className="h-6 w-12"
          />
        </div>
      </div>
    </div>
  );
}

/**
 * PracticeCardSkeleton - Matches LessonPractice flashcard structure
 */
export function PracticeCardSkeleton() {
  return (
    <div
      data-testid="practice-card-skeleton"
      aria-busy="true"
      className="border-neo-thick border-neo-black shadow-hard-lg bg-neo-navy rounded-neo animate-pulse overflow-hidden"
    >
      <div className="p-8 space-y-6">
        {/* Definition area */}
        <div data-testid="skeleton-definition" className="text-center space-y-2">
          <SkeletonBlock className="h-3 w-20 mx-auto" />
          <SkeletonBlock className="h-8 w-3/4 mx-auto" />
          <SkeletonBlock className="h-8 w-1/2 mx-auto" />
        </div>

        {/* Input area */}
        <div data-testid="skeleton-input">
          <SkeletonBlock className="h-14 w-full rounded-neo" />
        </div>

        {/* Buttons */}
        <div data-testid="skeleton-buttons" className="flex gap-3">
          <SkeletonBlock className="h-10 flex-1" />
          <SkeletonBlock className="h-10 flex-1" />
        </div>
      </div>
    </div>
  );
}

/**
 * SkeletonGrid - Renders multiple skeletons in a grid layout
 */
export function SkeletonGrid({
  count = 3,
  skeleton: Skeleton,
  className,
}: {
  count?: number;
  skeleton: React.ComponentType;
  className?: string;
}) {
  return (
    <div className={cn('grid grid-cols-1 lg:grid-cols-3 gap-6', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={`skel-${i}`} />
      ))}
    </div>
  );
}
