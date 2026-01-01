import { useState, useCallback, useRef, useEffect } from 'react';

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
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Clear timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const reset = useCallback(() => {
    setCopied(false);
    setError(null);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const copy = useCallback(
    async (text: string): Promise<boolean> => {
      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      try {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setError(null);
        onSuccess?.();

        // Auto-reset after delay
        timeoutRef.current = setTimeout(() => {
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
    [resetDelay, onSuccess, onError]
  );

  return { copied, error, copy, reset };
}

export default useCopyToClipboard;
