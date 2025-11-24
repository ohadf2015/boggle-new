import React from 'react';
import { motion } from 'framer-motion';
import { prefersReducedMotion } from '../utils/accessibility';

/**
 * Loading spinner component with accessibility support
 */
export function LoadingSpinner({ size = 'md', className = '' }) {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
  };

  const reducedMotion = prefersReducedMotion();

  return (
    <div className={`inline-block ${className}`} role="status" aria-label="Loading">
      <motion.div
        className={`${sizes[size]} border-4 border-cyan-200 border-t-cyan-500 rounded-full`}
        animate={reducedMotion ? {} : { rotate: 360 }}
        transition={
          reducedMotion
            ? {}
            : {
                duration: 1,
                repeat: Infinity,
                ease: 'linear',
              }
        }
      />
      <span className="sr-only">Loading...</span>
    </div>
  );
}

/**
 * Loading overlay component
 */
export function LoadingOverlay({ message = 'Loading...', transparent = false }) {
  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center ${
        transparent ? 'bg-black/30' : 'bg-black/50'
      }`}
      role="alert"
      aria-live="assertive"
      aria-busy="true"
    >
      <div className="bg-white dark:bg-slate-800 rounded-lg p-8 shadow-2xl flex flex-col items-center gap-4">
        <LoadingSpinner size="lg" />
        <p className="text-lg font-medium text-gray-700 dark:text-gray-200">{message}</p>
      </div>
    </div>
  );
}

/**
 * Inline loading state component
 */
export function InlineLoading({ message = 'Loading...', size = 'md' }) {
  return (
    <div className="flex items-center gap-3" role="status">
      <LoadingSpinner size={size} />
      <span className="text-gray-600 dark:text-gray-300">{message}</span>
    </div>
  );
}

/**
 * Skeleton loader for content
 */
export function SkeletonLoader({ className = '', count = 1 }) {
  const reducedMotion = prefersReducedMotion();

  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className={`bg-gray-200 dark:bg-gray-700 rounded ${className} ${
            reducedMotion ? '' : 'animate-pulse'
          }`}
          role="status"
          aria-label="Loading content"
        >
          <span className="sr-only">Loading...</span>
        </div>
      ))}
    </>
  );
}

/**
 * Button loading state
 */
export function ButtonLoader({ children, loading, disabled, ...props }) {
  return (
    <button {...props} disabled={disabled || loading} className={props.className}>
      {loading ? (
        <span className="flex items-center gap-2">
          <LoadingSpinner size="sm" />
          {children}
        </span>
      ) : (
        children
      )}
    </button>
  );
}
