'use client';

import { useState, useCallback } from 'react';

interface AsyncActionState<T> {
  /** The result data from the last successful execution */
  data: T | null;
  /** Whether the action is currently executing */
  isLoading: boolean;
  /** Error message from the last failed execution */
  error: string | null;
  /** Whether the action has been executed at least once */
  hasExecuted: boolean;
}

interface AsyncActionReturn<T, Args extends unknown[]> extends AsyncActionState<T> {
  /** Execute the async action */
  execute: (...args: Args) => Promise<T | null>;
  /** Reset the state to initial values */
  reset: () => void;
  /** Clear any error state */
  clearError: () => void;
}

/**
 * Hook for managing async actions with loading, error, and data states.
 * Simplifies the common pattern of useState for loading + error + data.
 *
 * @param asyncFn - The async function to execute
 * @param options - Optional configuration
 * @returns State and control functions for the async action
 *
 * @example
 * // Basic usage
 * const { execute, isLoading, error, data } = useAsyncAction(
 *   async (userId: string) => {
 *     const response = await fetch(`/api/users/${userId}`);
 *     return response.json();
 *   }
 * );
 *
 * // With error handling callback
 * const { execute, isLoading } = useAsyncAction(
 *   async () => saveData(formData),
 *   { onError: (err) => toast.error(err.message) }
 * );
 *
 * // In a component
 * <button onClick={() => execute('123')} disabled={isLoading}>
 *   {isLoading ? 'Loading...' : 'Load User'}
 * </button>
 */
export function useAsyncAction<T, Args extends unknown[] = []>(
  asyncFn: (...args: Args) => Promise<T>,
  options?: {
    /** Callback when the action succeeds */
    onSuccess?: (data: T) => void;
    /** Callback when the action fails */
    onError?: (error: Error) => void;
    /** Initial data value */
    initialData?: T | null;
  }
): AsyncActionReturn<T, Args> {
  const [state, setState] = useState<AsyncActionState<T>>({
    data: options?.initialData ?? null,
    isLoading: false,
    error: null,
    hasExecuted: false,
  });

  const execute = useCallback(async (...args: Args): Promise<T | null> => {
    setState(prev => ({
      ...prev,
      isLoading: true,
      error: null,
    }));

    try {
      const result = await asyncFn(...args);
      setState({
        data: result,
        isLoading: false,
        error: null,
        hasExecuted: true,
      });
      options?.onSuccess?.(result);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message,
        hasExecuted: true,
      }));
      options?.onError?.(error);
      return null;
    }
  }, [asyncFn, options]);

  const reset = useCallback(() => {
    setState({
      data: options?.initialData ?? null,
      isLoading: false,
      error: null,
      hasExecuted: false,
    });
  }, [options?.initialData]);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  return {
    ...state,
    execute,
    reset,
    clearError,
  };
}

/**
 * Hook for managing simple loading states with an action.
 * A lighter version of useAsyncAction when you don't need data/error tracking.
 *
 * @param asyncFn - The async function to execute
 * @returns Object with execute function and isLoading state
 *
 * @example
 * const { execute, isLoading } = useLoadingAction(async () => {
 *   await saveToServer(data);
 * });
 *
 * <button onClick={execute} disabled={isLoading}>
 *   {isLoading ? 'Saving...' : 'Save'}
 * </button>
 */
export function useLoadingAction<Args extends unknown[] = []>(
  asyncFn: (...args: Args) => Promise<void>
): {
  execute: (...args: Args) => Promise<void>;
  isLoading: boolean;
} {
  const [isLoading, setIsLoading] = useState(false);

  const execute = useCallback(async (...args: Args) => {
    setIsLoading(true);
    try {
      await asyncFn(...args);
    } finally {
      setIsLoading(false);
    }
  }, [asyncFn]);

  return { execute, isLoading };
}

export default useAsyncAction;
