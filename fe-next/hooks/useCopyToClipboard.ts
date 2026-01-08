import { useState, useCallback } from 'react';
import { useSafeTimeout } from './useSafeTimeout';

interface UseCopyToClipboardOptions {
  /** Delay in ms before resetting copied state (default: 2000) */
  resetDelay?: number;
  /** Callback when copy succeeds */
  onSuccess?: () => void;
  /** Callback when copy fails */
  onError?: (error: Error) => void;
}

interface UseCopyToClipboardReturn {
  /** Whether text was recently copied */
  copied: boolean;
  /** Error if copy failed */
  error: Error | null;
  /** Copy text to clipboard */
  copy: (text: string) => Promise<boolean>;
  /** Reset copied state manually */
  reset: () => void;
}

/**
 * Hook for copying text to clipboard with automatic reset
 *
 * @example
 * ```tsx
 * const { copied, copy } = useCopyToClipboard();
 *
 * return (
 *   <button onClick={() => copy(shareText)}>
 *     {copied ? <Check /> : <Copy />}
 *     {copied ? 'Copied!' : 'Copy'}
 *   </button>
 * );
 * ```
 */
export function useCopyToClipboard(
  options: UseCopyToClipboardOptions = {}
): UseCopyToClipboardReturn {
  const { resetDelay = 2000, onSuccess, onError } = options;

  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { set: setTimeout, clear: clearTimeout } = useSafeTimeout();

  const reset = useCallback(() => {
    setCopied(false);
    setError(null);
    clearTimeout();
  }, [clearTimeout]);

  const copy = useCallback(
    async (text: string): Promise<boolean> => {
      try {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setError(null);
        onSuccess?.();

        // Auto-reset after delay
        setTimeout(() => {
          setCopied(false);
        }, resetDelay);

        return true;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to copy to clipboard');
        setError(error);
        setCopied(false);
        onError?.(error);
        console.error('Failed to copy:', error);
        return false;
      }
    },
    [resetDelay, onSuccess, onError, setTimeout]
  );

  return { copied, error, copy, reset };
}

export default useCopyToClipboard;
