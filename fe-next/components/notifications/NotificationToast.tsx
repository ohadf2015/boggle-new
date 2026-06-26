'use client';

/**
 * NotificationToast Component
 * Toast popup for new notifications (in-app)
 */

import React, { useEffect, useState, useCallback } from 'react';
import { X } from 'lucide-react';
import { NOTIFICATION_TYPE_ICONS, NOTIFICATION_TYPE_COLORS, type NotificationToastProps } from './types';

const AUTO_DISMISS_MS = 5000;

export function NotificationToast({ notification, onDismiss, onAction }: NotificationToastProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  // Define handleDismiss before useEffect to avoid reference errors
  const handleDismiss = useCallback(() => {
    setIsLeaving(true);
    setTimeout(() => {
      setIsVisible(false);
      onDismiss();
    }, 200);
  }, [onDismiss]);

  const handleClick = useCallback(() => {
    onAction();
    handleDismiss();
  }, [onAction, handleDismiss]);

  // Handle show/hide animation
  useEffect(() => {
    if (notification) {
      setIsLeaving(false);
      // Small delay for animation
      requestAnimationFrame(() => setIsVisible(true));

      // Auto-dismiss after timeout
      const timer = setTimeout(() => {
        handleDismiss();
      }, AUTO_DISMISS_MS);

      return () => clearTimeout(timer);
    }

    setIsVisible(false);
    return undefined;
  }, [notification, handleDismiss]);

  if (!notification || !isVisible) return null;

  const icon = NOTIFICATION_TYPE_ICONS[notification.notification_type];
  const colorClass = NOTIFICATION_TYPE_COLORS[notification.notification_type];

  return (
    <div
      className={`
        fixed top-20 inset-e-4 z-[100]
        w-80 max-w-[calc(100vw-2rem)]
        transition-all duration-200 ease-out
        ${isLeaving ? 'opacity-0 translate-x-4' : 'opacity-100 translate-x-0'}
      `}
    >
      <div
        onClick={handleClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e: React.KeyboardEvent) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleClick();
          }
        }}
        className="
          relative flex gap-3 p-4 cursor-pointer
          bg-neo-navy border-3 border-black rounded-lg
          shadow-hard-lg
          hover:shadow-hard transition-shadow
        "
      >
        {/* Icon */}
        <div
          className={`
            shrink-0 w-12 h-12 rounded-lg flex items-center justify-center
            border-2 border-black ${colorClass}
            text-xl text-black shadow-hard-sm
          `}
        >
          {icon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-neo-display text-neo-white font-bold truncate">
            {notification.title}
          </h4>
          <p className="text-xs text-neo-white line-clamp-2 mt-0.5">
            {notification.body}
          </p>
        </div>

        {/* Close button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleDismiss();
          }}
          className="
            absolute top-2 inset-e-2
            w-6 h-6 rounded-md flex items-center justify-center
            text-neo-white hover:text-neo-white hover:bg-white/10
            transition-colors
          "
        >
          <X size={14} />
        </button>

        {/* Progress bar for auto-dismiss */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/20 rounded-b-lg overflow-hidden">
          <div
            className="h-full bg-neo-lime animate-shrink-width"
            style={{
              animationDuration: `${AUTO_DISMISS_MS}ms`,
            }}
          />
        </div>
      </div>
    </div>
  );
}

export default NotificationToast;
