'use client';

import { useCallback } from 'react';
import { neoErrorToast, neoSuccessToast, neoWarningToast, neoInfoToast } from '@/components/NeoToast';

/**
 * Options for error/success toast display
 */
interface ToastOptions {
  /** Custom icon for the toast */
  icon?: string;
  /** Toast duration in ms */
  duration?: number;
  /** Unique ID to prevent duplicate toasts */
  id?: string;
}

/**
 * Return type for useAdminError hook
 */
interface UseAdminErrorResult {
  /** Display an error toast message */
  showError: (message: string, options?: ToastOptions) => void;
  /** Display a success toast message */
  showSuccess: (message: string, options?: ToastOptions) => void;
  /** Display a warning toast message */
  showWarning: (message: string, options?: ToastOptions) => void;
  /** Display an info toast message */
  showInfo: (message: string, options?: ToastOptions) => void;
  /**
   * Handle an error (logs and shows toast)
   * Extracts message from Error objects
   */
  handleError: (error: unknown, fallbackMessage?: string) => void;
}

/**
 * Hook for consistent error handling in admin components
 *
 * Replaces alert() calls with Neo-Brutalist toasts and provides
 * consistent error handling patterns across the admin dashboard.
 *
 * @example
 * const { showError, showSuccess, handleError } = useAdminError();
 *
 * // Show success toast
 * showSuccess('Changes saved successfully!');
 *
 * // Show error toast
 * showError('Failed to update word');
 *
 * // Handle errors in try/catch
 * try {
 *   await saveData();
 *   showSuccess('Saved!');
 * } catch (error) {
 *   handleError(error, 'Failed to save data');
 * }
 */
export function useAdminError(): UseAdminErrorResult {
  const showError = useCallback((message: string, options?: ToastOptions) => {
    neoErrorToast(message, {
      icon: options?.icon ?? '✕',
      duration: options?.duration ?? 4000,
      id: options?.id,
    });
  }, []);

  const showSuccess = useCallback((message: string, options?: ToastOptions) => {
    neoSuccessToast(message, {
      icon: options?.icon ?? '✓',
      duration: options?.duration ?? 3000,
      id: options?.id,
    });
  }, []);

  const showWarning = useCallback((message: string, options?: ToastOptions) => {
    neoWarningToast(message, {
      icon: options?.icon ?? '⚠',
      duration: options?.duration ?? 4000,
      id: options?.id,
    });
  }, []);

  const showInfo = useCallback((message: string, options?: ToastOptions) => {
    neoInfoToast(message, {
      icon: options?.icon ?? 'ℹ',
      duration: options?.duration ?? 3000,
      id: options?.id,
    });
  }, []);

  const handleError = useCallback(
    (error: unknown, fallbackMessage: string = 'An unexpected error occurred') => {
      // Extract error message
      let message: string;
      if (error instanceof Error) {
        message = error.message;
      } else if (typeof error === 'string') {
        message = error;
      } else if (error && typeof error === 'object' && 'message' in error) {
        message = String((error as { message: unknown }).message);
      } else {
        message = fallbackMessage;
      }

      // Log error for debugging
      console.error('[Admin Error]', error);

      // Show toast
      showError(message);
    },
    [showError]
  );

  return {
    showError,
    showSuccess,
    showWarning,
    showInfo,
    handleError,
  };
}

export default useAdminError;
