import { useState, useEffect } from 'react';

interface FeatureFlagResult {
  enabled: boolean;
  loading: boolean;
  error: Error | null;
}

/**
 * Hook to check if a feature flag is enabled for the current user
 * @param flagName Feature flag name to check
 * @param userId User ID (optional - for guest users, pass null)
 * @returns Object with enabled status, loading state, and error
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { enabled, loading } = useFeatureFlag('my_feature', user?.id);
 *
 *   if (loading) return <Spinner />;
 *   if (!enabled) return null;
 *
 *   return <FeatureComponent />;
 * }
 * ```
 */
export function useFeatureFlag(
  flagName: string,
  userId?: string | null
): FeatureFlagResult {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function checkFeatureFlag() {
      try {
        setLoading(true);
        setError(null);

        // Dev-only: check localStorage override for E2E testing
        if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
          const overridesStr = window.localStorage.getItem('feature_flag_overrides');
          if (overridesStr) {
            try {
              const overrides = JSON.parse(overridesStr);
              if (flagName in overrides) {
                if (isMounted) {
                  setEnabled(overrides[flagName] === true);
                  setLoading(false);
                }
                return;
              }
            } catch {
              // Ignore parse errors, fall through to API check
            }
          }
        }

        // Call backend API to check feature flag (supports guest users with null userId)
        const response = await fetch(`/api/feature-flags/check`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            flagName,
            userId: userId || null, // Explicitly pass null for guest users
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to check feature flag');
        }

        const data = await response.json();

        if (isMounted) {
          setEnabled(data.enabled || false);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err : new Error('Unknown error'));
          setEnabled(false);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    checkFeatureFlag();

    return () => {
      isMounted = false;
    };
  }, [flagName, userId]);

  return { enabled, loading, error };
}
