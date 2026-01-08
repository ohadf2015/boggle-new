'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { ValidationResult } from '../utils/validation';

// Re-export for backward compatibility
export type { ValidationResult };

export type ValidationState = 'idle' | 'validating' | 'valid' | 'invalid';

/** Type for validation functions used with useDebouncedValidation */
export type ValidationFunction = (value: string) => ValidationResult;

interface UseDebouncedValidationOptions {
  /** Debounce delay in milliseconds (default: 300ms) */
  delay?: number;
  /** Minimum characters before validation runs (default: 1) */
  minLength?: number;
  /** Validation function */
  validate: (value: string) => ValidationResult;
}

interface UseDebouncedValidationReturn {
  /** Current validation state */
  state: ValidationState;
  /** Error message if invalid */
  errorKey: string | undefined;
  /** Whether the field has an error */
  hasError: boolean;
  /** Whether validation is in progress */
  isValidating: boolean;
  /** Clear validation state (e.g., when field is reset) */
  reset: () => void;
  /** Trigger immediate validation (bypass debounce) */
  validateNow: () => ValidationResult;
}

/**
 * Hook for debounced field validation with visual feedback
 *
 * @example
 * ```tsx
 * const { state, errorKey, hasError } = useDebouncedValidation(username, {
 *   validate: validateUsername,
 *   delay: 300,
 * });
 *
 * return (
 *   <Input
 *     value={username}
 *     onChange={e => setUsername(e.target.value)}
 *     className={hasError ? 'border-red-500' : state === 'valid' ? 'border-green-500' : ''}
 *   />
 * );
 * ```
 */
export function useDebouncedValidation(
  value: string,
  options: UseDebouncedValidationOptions
): UseDebouncedValidationReturn {
  const { delay = 300, minLength = 1, validate } = options;

  const [state, setState] = useState<ValidationState>('idle');
  const [errorKey, setErrorKey] = useState<string | undefined>(undefined);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const validateRef = useRef(validate);

  // Keep validate function ref updated
  validateRef.current = validate;

  const reset = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setState('idle');
    setErrorKey(undefined);
  }, []);

  const validateNow = useCallback((): ValidationResult => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    const result = validateRef.current(value);
    setState(result.isValid ? 'valid' : 'invalid');
    setErrorKey(result.error);
    return result;
  }, [value]);

  useEffect(() => {
    // Clear previous timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Don't validate if below minimum length
    if (value.length < minLength) {
      setState('idle');
      setErrorKey(undefined);
      return;
    }

    // Show validating state
    setState('validating');

    // Debounce validation
    timeoutRef.current = setTimeout(() => {
      const result = validateRef.current(value);
      setState(result.isValid ? 'valid' : 'invalid');
      setErrorKey(result.error);
    }, delay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [value, delay, minLength]);

  return {
    state,
    errorKey,
    hasError: state === 'invalid',
    isValidating: state === 'validating',
    reset,
    validateNow,
  };
}

/**
 * Get CSS classes for validation state visual feedback
 */
export function getValidationClasses(
  state: ValidationState,
  baseClasses: string = ''
): string {
  const stateClasses: Record<ValidationState, string> = {
    idle: '',
    validating: 'border-neo-yellow/50',
    valid: 'border-neo-lime focus-visible:ring-neo-lime',
    invalid: 'border-neo-red bg-red-900/20 focus-visible:ring-neo-red',
  };

  return `${baseClasses} ${stateClasses[state]}`.trim();
}

// Default export removed - use named export instead
