'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PullToRefreshIndicatorProps {
  pullDistance: number;
  isRefreshing: boolean;
  threshold: number;
  className?: string;
}

/**
 * PullToRefreshIndicator - Visual feedback for pull-to-refresh
 *
 * Shows a rotating refresh icon that indicates pull progress
 */
export const PullToRefreshIndicator: React.FC<PullToRefreshIndicatorProps> = ({
  pullDistance,
  isRefreshing,
  threshold,
  className,
}) => {
  const progress = Math.min(pullDistance / threshold, 1);
  const opacity = Math.min(progress * 2, 1);

  return (
    <motion.div
      className={cn(
        'absolute top-0 left-0 right-0 flex justify-center items-center z-50',
        className
      )}
      style={{
        height: pullDistance,
        opacity,
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity }}
    >
      <motion.div
        className="bg-white dark:bg-neo-navy rounded-full p-2 shadow-neo-brutalist border-2 border-neo-black"
        animate={{
          rotate: isRefreshing ? 360 : progress * 180,
        }}
        transition={{
          rotate: isRefreshing
            ? { duration: 1, repeat: Infinity, ease: 'linear' }
            : { duration: 0.3 },
        }}
      >
        <RefreshCw
          className={cn(
            'w-5 h-5',
            progress >= 1 ? 'text-neo-purple' : 'text-gray-400'
          )}
        />
      </motion.div>
    </motion.div>
  );
};
