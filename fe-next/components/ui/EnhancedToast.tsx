'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, Info, AlertTriangle, X } from 'lucide-react';
import { cn } from '@/lib/utils';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

declare global {
  interface WindowEventMap {
    'show-toast': CustomEvent<Toast>;
  }
}

interface ToastItemProps {
  toast: Toast;
  onRemove: (id: string) => void;
}

/**
 * Individual Toast Item Component
 */
const ToastItem: React.FC<ToastItemProps> = ({ toast, onRemove }) => {
  const [progress, setProgress] = useState(100);
  const duration = toast.duration || 5000;
  const isPausedRef = useRef(false);
  const elapsedBeforePauseRef = useRef(0);
  const segmentStartRef = useRef(0);

  // Auto-dismiss progress
  useEffect(() => {
    elapsedBeforePauseRef.current = 0;
    segmentStartRef.current = Date.now();
    const interval = setInterval(() => {
      if (isPausedRef.current) return;
      const elapsed = elapsedBeforePauseRef.current + (Date.now() - segmentStartRef.current);
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);

      if (remaining === 0) {
        clearInterval(interval);
        onRemove(toast.id);
      }
    }, 50);

    return () => clearInterval(interval);
  }, [duration, onRemove, toast.id]);

  // Icon and color configuration
  const config = {
    success: {
      icon: CheckCircle,
      bg: 'bg-neo-lime',
      border: 'border-neo-lime',
      text: 'text-neo-black',
    },
    error: {
      icon: XCircle,
      bg: 'bg-neo-red',
      border: 'border-neo-red',
      text: 'text-neo-black',
    },
    info: {
      icon: Info,
      bg: 'bg-neo-cyan',
      border: 'border-neo-cyan',
      text: 'text-neo-black',
    },
    warning: {
      icon: AlertTriangle,
      bg: 'bg-neo-yellow',
      border: 'border-neo-yellow',
      text: 'text-neo-black',
    },
  };

  const { icon: Icon, bg, border, text } = config[toast.type];

  return (
    <m.div
      layout
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100, scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className={cn(
        'relative w-full max-w-sm overflow-hidden rounded-neo border-4 shadow-hard-lg',
        bg,
        border
      )}
      role="alert"
      aria-live="polite"
      onMouseEnter={() => {
        isPausedRef.current = true;
        elapsedBeforePauseRef.current += Date.now() - segmentStartRef.current;
      }}
      onMouseLeave={() => {
        isPausedRef.current = false;
        segmentStartRef.current = Date.now();
      }}
    >
      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 h-1 bg-neo-black/20">
        <m.div
          className="h-full bg-neo-black/40"
          initial={{ width: '100%' }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.05, ease: 'linear' }}
        />
      </div>

      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className={cn('shrink-0 mt-0.5', text)}>
            <Icon className="w-6 h-6" aria-hidden="true" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <h4 className={cn('font-black text-lg leading-tight', text)}>
              {toast.title}
            </h4>
            {toast.message && (
              <p className={cn('text-sm font-medium mt-1 opacity-90', text)}>
                {toast.message}
              </p>
            )}

            {/* Action button */}
            {toast.action && (
              <button
                onClick={() => {
                  toast.action?.onClick();
                  onRemove(toast.id);
                }}
                className={cn(
                  'mt-3 px-3 py-1.5 text-sm font-bold rounded-neo border-2 border-neo-black shadow-hard-sm',
                  'hover:shadow-hard hover:-translate-x-px hover:-translate-y-px',
                  'active:shadow-none active:translate-x-px active:translate-y-px',
                  'transition-all duration-100',
                  bg === 'bg-neo-black' ? 'bg-white text-neo-black' : 'bg-neo-black text-white'
                )}
              >
                {toast.action.label}
              </button>
            )}
          </div>

          {/* Close button */}
          <button
            onClick={() => onRemove(toast.id)}
            className={cn(
              'shrink-0 p-2.5 rounded-neo cursor-pointer',
              'hover:bg-neo-black/10 active:bg-neo-black/20',
              'transition-colors',
              text
            )}
            aria-label="Dismiss notification"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </m.div>
  );
};

/**
 * Toast Container Component
 * Position toasts in a corner of the screen
 */
interface ToastContainerProps {
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'top-center' | 'bottom-center';
  className?: string;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({
  position = 'bottom-right',
  className,
}) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Position styles
  const positionStyles = {
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'top-center': 'top-4 left-1/2 -translate-x-1/2',
    'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2',
  };

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Global toast function
  useEffect(() => {
    const handleToast = (event: CustomEvent<Toast>) => {
      const newToast = {
        ...event.detail,
        id: event.detail.id || Math.random().toString(36).substr(2, 9),
      };
      setToasts((prev) => [...prev, newToast]);
    };

    window.addEventListener('show-toast', handleToast);
    return () => window.removeEventListener('show-toast', handleToast);
  }, []);

  return (
    <div
      className={cn(
        'fixed z-50 flex flex-col gap-3 pointer-events-none',
        positionStyles[position],
        className
      )}
    >
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <ToastItem toast={toast} onRemove={removeToast} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
};

/**
 * Toast utility function
 * Usage: showToast({ type: 'success', title: 'Word found!', message: '+15 points' })
 */
export const showToast = (options: Omit<Toast, 'id'>) => {
  const event = new CustomEvent('show-toast', {
    detail: {
      ...options,
      id: Math.random().toString(36).substr(2, 9),
    },
  });
  window.dispatchEvent(event);
};

/**
 * Pre-configured toast helpers
 */
export const toast = {
  success: (title: string, message?: string, action?: Toast['action']) =>
    showToast({ type: 'success', title, message, action }),
  error: (title: string, message?: string, action?: Toast['action']) =>
    showToast({ type: 'error', title, message, action }),
  info: (title: string, message?: string, action?: Toast['action']) =>
    showToast({ type: 'info', title, message, action }),
  warning: (title: string, message?: string, action?: Toast['action']) =>
    showToast({ type: 'warning', title, message, action }),
};

export type { Toast, ToastType };
