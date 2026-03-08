/**
 * FormField - Accessible form field wrapper component
 *
 * Provides standardized accessibility patterns for form fields:
 * - Automatic label association via htmlFor/id
 * - Error message with role="alert" and aria-describedby
 * - Hint text support
 * - Required field indicator
 * - aria-invalid for validation state
 *
 * @example
 * ```tsx
 * <FormField
 *   id="username"
 *   label="Username"
 *   error={errors.username}
 *   hint="Choose a unique username"
 *   required
 * >
 *   <Input />
 * </FormField>
 * ```
 */

import React from 'react';
import { Label } from './label';
import { cn } from '@/lib/utils';

interface FormFieldProps {
  /** Unique ID for the form field - used for label association */
  id: string;
  /** Label text displayed above the input */
  label: string;
  /** Error message to display (shows in red with role="alert") */
  error?: string;
  /** Hint text displayed below the input when there's no error */
  hint?: string;
  /** Whether the field is required */
  required?: boolean;
  /** Additional className for the wrapper */
  className?: string;
  /** The form input element */
  children: React.ReactElement;
}

export const FormField: React.FC<FormFieldProps> = ({
  id,
  label,
  error,
  hint,
  required,
  className,
  children,
}) => {
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;

  // Build aria-describedby from available descriptions
  const describedBy = [error && errorId, hint && !error && hintId]
    .filter(Boolean)
    .join(' ') || undefined;

  // Clone the child element and add accessibility props
  const enhancedChild = React.cloneElement(children as React.ReactElement<Record<string, unknown>>, {
    id,
    'aria-invalid': error ? 'true' : undefined,
    'aria-describedby': describedBy,
    'aria-required': required ? 'true' : undefined,
  });

  return (
    <div className={cn('space-y-1.5', className)}>
      <Label htmlFor={id} className="text-sm font-bold">
        {label}
        {required && (
          <>
            <span className="text-neo-red ms-1" aria-hidden="true">*</span>
            <span className="sr-only"> (required)</span>
          </>
        )}
      </Label>

      {enhancedChild}

      {/* Hint text - shown when there's no error */}
      {hint && !error && (
        <p
          id={hintId}
          className="text-xs text-neo-black/60 dark:text-slate-400"
        >
          {hint}
        </p>
      )}

      {/* Error message - shown with role="alert" for screen reader announcement */}
      {error && (
        <p
          id={errorId}
          className="text-xs text-neo-red font-medium"
          role="alert"
        >
          {error}
        </p>
      )}
    </div>
  );
};

export default FormField;
