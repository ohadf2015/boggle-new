'use client';

import React, { forwardRef, useMemo } from 'react';
import { Check, AlertCircle, Loader2 } from 'lucide-react';
import { Input, type InputProps } from './input';
import {
  useDebouncedValidation,
  getValidationClasses,
  type ValidationState,
  type ValidationFunction,
} from '@/hooks/useDebouncedValidation';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

export interface ValidatedInputProps extends Omit<InputProps, 'value' | 'onChange'> {
  /** Current input value (controlled) */
  value: string;
  /** Called when input value changes */
  onChange: (value: string) => void;
  /** Validation function that returns { isValid, error? } */
  validate: ValidationFunction;
  /** Debounce delay in milliseconds (default: 300) */
  debounceDelay?: number;
  /** Minimum characters before validation runs (default: 1) */
  minLength?: number;
  /** Show validation status icon inside the input */
  showStatusIcon?: boolean;
  /** Show error message below input */
  showErrorMessage?: boolean;
  /** Additional class for the wrapper div */
  wrapperClassName?: string;
  /** Called when validation state changes */
  onValidationChange?: (state: ValidationState, errorKey?: string) => void;
}

/**
 * Input component with built-in debounced validation and visual feedback.
 * Wraps the base Input component with validation state management.
 *
 * @example
 * // Basic usage with username validation
 * <ValidatedInput
 *   value={username}
 *   onChange={setUsername}
 *   validate={validateUsername}
 *   placeholder="Enter username"
 * />
 *
 * @example
 * // With custom styling and all features
 * <ValidatedInput
 *   value={email}
 *   onChange={setEmail}
 *   validate={validateEmail}
 *   debounceDelay={500}
 *   minLength={3}
 *   showStatusIcon
 *   showErrorMessage
 *   placeholder="Enter email"
 *   onValidationChange={(state) => setCanSubmit(state === 'valid')}
 * />
 */
export const ValidatedInput = forwardRef<HTMLInputElement, ValidatedInputProps>(
  (
    {
      value,
      onChange,
      validate,
      debounceDelay = 300,
      minLength = 1,
      showStatusIcon = true,
      showErrorMessage = true,
      wrapperClassName,
      onValidationChange,
      className,
      ...inputProps
    },
    ref
  ) => {
    const { t } = useLanguage();

    const { state, errorKey, hasError, isValidating } = useDebouncedValidation(value, {
      validate,
      delay: debounceDelay,
      minLength,
    });

    // Notify parent of validation state changes
    React.useEffect(() => {
      onValidationChange?.(state, errorKey);
    }, [state, errorKey, onValidationChange]);

    const validationClasses = useMemo(
      () => getValidationClasses(state),
      [state]
    );

    const statusIcon = useMemo(() => {
      if (!showStatusIcon) return null;

      switch (state) {
        case 'validating':
          return (
            <Loader2
              className="w-4 h-4 text-neo-yellow animate-spin"
              aria-label={t('common.validating') || 'Validating...'}
            />
          );
        case 'valid':
          return (
            <Check
              className="w-4 h-4 text-neo-lime"
              aria-label={t('common.valid') || 'Valid'}
            />
          );
        case 'invalid':
          return (
            <AlertCircle
              className="w-4 h-4 text-neo-red"
              aria-label={t('common.invalid') || 'Invalid'}
            />
          );
        default:
          return null;
      }
    }, [state, showStatusIcon, t]);

    const errorMessage = useMemo(() => {
      if (!showErrorMessage || !hasError || !errorKey) return null;
      // errorKey is expected to be a translation key
      return t(errorKey) || errorKey;
    }, [showErrorMessage, hasError, errorKey, t]);

    return (
      <div className={cn('relative', wrapperClassName)}>
        <div className="relative">
          <Input
            ref={ref}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={cn(
              validationClasses,
              showStatusIcon && 'pr-10', // Make room for status icon
              className
            )}
            aria-invalid={hasError}
            aria-describedby={errorKey ? `${inputProps.id}-error` : undefined}
            {...inputProps}
          />
          {statusIcon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
              {statusIcon}
            </div>
          )}
        </div>
        {errorMessage && (
          <p
            id={inputProps.id ? `${inputProps.id}-error` : undefined}
            className="mt-1 text-xs font-medium text-neo-red"
            role="alert"
          >
            {errorMessage}
          </p>
        )}
      </div>
    );
  }
);

ValidatedInput.displayName = 'ValidatedInput';

export default ValidatedInput;
