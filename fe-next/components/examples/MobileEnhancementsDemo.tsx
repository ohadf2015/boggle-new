'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSwipeGesture } from '@/hooks/useSwipeGesture';
import { useSwipeToDismiss } from '@/hooks/useSwipeToDismiss';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { PullToRefreshIndicator } from '@/components/ui/PullToRefreshIndicator';
import { triggerHaptic } from '@/utils/hapticFeedback';
import {
  MOBILE_BUTTON_STYLES,
  MOBILE_ICON_BUTTON_STYLES,
  TOUCH_TARGET_MIN,
} from '@/utils/mobileAccessibility';

/**
 * MobileEnhancementsDemo - Example component showcasing all mobile UX features
 *
 * This component demonstrates:
 * - Swipe gestures for navigation
 * - Swipe-to-dismiss for modals
 * - Pull-to-refresh
 * - Haptic feedback
 * - Mobile-optimized touch targets
 * - RTL support
 */
export const MobileEnhancementsDemo: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const totalPages = 3;

  // Swipe navigation
  const swipeHandlers = useSwipeGesture({
    onSwipeLeft: () => {
      if (currentPage < totalPages) {
        setCurrentPage((p) => p + 1);
      }
    },
    onSwipeRight: () => {
      if (currentPage > 1) {
        setCurrentPage((p) => p - 1);
      }
    },
    enableHaptic: true,
  });

  // Pull to refresh
  const { pullToRefreshHandlers, pullState, isAtThreshold } = usePullToRefresh({
    onRefresh: async () => {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1500));
      setLastRefresh(new Date());
      triggerHaptic('success');
    },
  });

  return (
    <div className="min-h-screen bg-neo-cream p-4">
      <h1 className="text-3xl font-black mb-6 text-center">
        Mobile UX Enhancements Demo
      </h1>

      {/* Pull-to-refresh demo */}
      <div
        className="bg-white rounded-neo border-2 border-neo-black p-6 mb-6 relative overflow-hidden max-h-[300px] overflow-y-auto"
        {...pullToRefreshHandlers}
      >
        <PullToRefreshIndicator
          pullDistance={pullState.pullDistance}
          isRefreshing={pullState.isRefreshing}
          threshold={80}
        />

        <h2 className="text-xl font-bold mb-3">Pull to Refresh</h2>
        <p className="text-gray-600 mb-2">
          Swipe down to refresh this content
        </p>
        <p className="text-sm text-gray-500">
          Last refreshed: {lastRefresh.toLocaleTimeString()}
        </p>

        {pullState.isRefreshing && (
          <div className="text-center text-neo-pink font-bold mt-4">
            Refreshing...
          </div>
        )}

        {/* Dummy content for scrolling */}
        <div className="space-y-2 mt-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className="bg-gray-100 rounded p-3 border border-gray-200"
            >
              Item {i + 1}
            </div>
          ))}
        </div>
      </div>

      {/* Swipe navigation demo */}
      <div
        className="bg-white rounded-neo border-2 border-neo-black p-6 mb-6"
        {...swipeHandlers}
      >
        <h2 className="text-xl font-bold mb-3">Swipe Navigation</h2>
        <p className="text-gray-600 mb-4">
          Swipe left or right to navigate pages
        </p>

        <div className="flex items-center justify-between mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className={MOBILE_ICON_BUTTON_STYLES}
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>

          <div className="text-center">
            <div className="text-2xl font-black">Page {currentPage}</div>
            <div className="text-sm text-gray-500">of {totalPages}</div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className={MOBILE_ICON_BUTTON_STYLES}
          >
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>

        {/* Page indicator dots */}
        <div className="flex justify-center gap-2">
          {Array.from({ length: totalPages }).map((_, i) => (
            <div
              key={i}
              className={`h-2 rounded-full transition-all ${
                i + 1 === currentPage
                  ? 'w-8 bg-neo-pink'
                  : 'w-2 bg-gray-300'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Haptic feedback demo */}
      <div className="bg-white text-gray-900 rounded-neo border-2 border-neo-black p-6 mb-6">
        <h2 className="text-xl font-bold mb-3">Haptic Feedback</h2>
        <p className="text-gray-600 mb-4">
          Tap buttons to feel different haptic patterns
        </p>

        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="outline"
            onClick={() => triggerHaptic('light')}
            className={MOBILE_BUTTON_STYLES}
          >
            Light
          </Button>
          <Button
            variant="outline"
            onClick={() => triggerHaptic('medium')}
            className={MOBILE_BUTTON_STYLES}
          >
            Medium
          </Button>
          <Button
            variant="outline"
            onClick={() => triggerHaptic('heavy')}
            className={MOBILE_BUTTON_STYLES}
          >
            Heavy
          </Button>
          <Button
            variant="outline"
            onClick={() => triggerHaptic('success')}
            className={MOBILE_BUTTON_STYLES}
          >
            Success
          </Button>
          <Button
            variant="outline"
            onClick={() => triggerHaptic('error')}
            className={MOBILE_BUTTON_STYLES}
          >
            Error
          </Button>
          <Button
            variant="outline"
            onClick={() => triggerHaptic('warning')}
            className={MOBILE_BUTTON_STYLES}
          >
            Warning
          </Button>
        </div>
      </div>

      {/* Swipe-to-dismiss modal demo */}
      <div className="bg-white text-gray-900 rounded-neo border-2 border-neo-black p-6">
        <h2 className="text-xl font-bold mb-3">Swipe to Dismiss</h2>
        <p className="text-gray-600 mb-4">
          Open a modal and swipe down to dismiss it
        </p>

        <Button
          onClick={() => {
            setIsModalOpen(true);
            triggerHaptic('medium');
          }}
          className={MOBILE_BUTTON_STYLES}
        >
          Open Modal
        </Button>
      </div>

      {/* Modal with swipe-to-dismiss */}
      {isModalOpen && <SwipeToDismissModal onClose={() => setIsModalOpen(false)} />}
    </div>
  );
};

// Separate component for swipe-to-dismiss modal
const SwipeToDismissModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { swipeToDismissHandlers, swipeState } = useSwipeToDismiss({
    onDismiss: onClose,
    direction: 'down',
    threshold: 100,
  });

  return (
    <div className="fixed inset-0 bg-black/50 text-white z-50 flex items-end sm:items-center justify-center p-4">
      <motion.div
        className="bg-white rounded-t-neo sm:rounded-neo border-2 border-neo-black w-full max-w-lg p-6 relative"
        style={{
          transform: `translateY(${swipeState.swipeDistance}px)`,
        }}
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        {...swipeToDismissHandlers}
      >
        {/* Swipe indicator */}
        <div className="flex justify-center mb-4">
          <div className="w-12 h-1 bg-gray-300 rounded-full" />
        </div>

        <button
          onClick={onClose}
          className={`absolute top-4 right-4 ${MOBILE_ICON_BUTTON_STYLES}`}
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-2xl font-black mb-4">Swipe Down to Close</h2>
        <p className="text-gray-600 mb-6">
          This modal can be dismissed by swiping down or tapping the X button.
        </p>

        <div className="space-y-4">
          <p>Try swiping down on this modal to close it!</p>
          <p className="text-sm text-gray-500">
            Current swipe distance: {Math.round(swipeState.swipeDistance)}px
          </p>
          <p className="text-sm text-gray-500">
            Threshold: 100px {swipeState.swipeDistance >= 100 && '✓ Will dismiss!'}
          </p>
        </div>

        <Button
          onClick={onClose}
          className={`w-full mt-6 ${MOBILE_BUTTON_STYLES}`}
        >
          Close
        </Button>
      </motion.div>
    </div>
  );
};
