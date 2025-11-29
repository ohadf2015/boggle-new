import React from 'react';
import { motion } from 'framer-motion';
import { prefersReducedMotion } from '../utils/accessibility';

/**
 * LoadingSpinner - Neo-Brutalist styled loading spinner
 */
export function LoadingSpinner({ size = 'md', className = '' }) {
  const sizes = {
    sm: 'w-5 h-5',
    md: 'w-10 h-10',
    lg: 'w-14 h-14',
    xl: 'w-20 h-20',
  };

  const borderSizes = {
    sm: 'border-2',
    md: 'border-3',
    lg: 'border-4',
    xl: 'border-4',
  };

  const reducedMotion = prefersReducedMotion();

  return (
    <div className={`inline-block ${className}`} role="status" aria-label="Loading">
      <motion.div
        className={`
          ${sizes[size]} ${borderSizes[size]}
          border-neo-black border-t-neo-yellow
          rounded-full
        `}
        animate={reducedMotion ? {} : { rotate: 360 }}
        transition={
          reducedMotion
            ? {}
            : {
                duration: 0.8,
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
 * LoadingOverlay - Neo-Brutalist styled loading overlay
 */
export function LoadingOverlay({ message = 'Loading...', transparent = false }) {
  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center ${
        transparent ? 'bg-neo-black/50' : 'bg-neo-black/80'
      }`}
      style={{ backgroundImage: 'var(--halftone-pattern-lg)' }}
      role="alert"
      aria-live="assertive"
      aria-busy="true"
    >
      <motion.div
        initial={{ scale: 0.8, rotate: -5 }}
        animate={{ scale: 1, rotate: 2 }}
        transition={{ duration: 0.3, ease: [0.68, -0.55, 0.265, 1.55] }}
        className="
          bg-neo-cream
          border-4 border-neo-black
          rounded-neo-lg
          shadow-hard-xl
          p-6 sm:p-8
          flex flex-col items-center gap-4
        "
      >
        <LoadingSpinner size="lg" />
        <p className="text-lg font-black uppercase tracking-wide text-neo-black">
          {message}
        </p>
      </motion.div>
    </div>
  );
}

/**
 * InlineLoading - Neo-Brutalist styled inline loading
 */
export function InlineLoading({ message = 'Loading...', size = 'md' }) {
  return (
    <div className="flex items-center gap-3" role="status">
      <LoadingSpinner size={size} />
      <span className="font-bold text-neo-cream">{message}</span>
    </div>
  );
}

/**
 * SkeletonLoader - Neo-Brutalist styled skeleton loader
 */
export function SkeletonLoader({ className = '', count = 1 }) {
  const reducedMotion = prefersReducedMotion();

  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className={`
            bg-neo-navy-light
            border-2 border-neo-black/20
            rounded-neo
            ${className}
            ${reducedMotion ? '' : 'animate-pulse'}
          `}
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
 * ButtonLoader - Neo-Brutalist styled button with loading state
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
