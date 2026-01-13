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
 *   const { enabled, loading } = useFeatureFlag('daily_buzz_images', user?.id);
 *
 *   if (loading) return <Spinner />;
 *   if (!enabled) return null;
 *
 *   return <ImageFeature />;
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

/**
 * Specific hook for checking Daily Buzz images feature
 * @param userId User ID (optional)
 * @returns Object with enabled status, loading state, and error
 *
 * @example
 * ```tsx
 * function BuzzChallengeCard() {
 *   const { enabled: showImages } = useDailyBuzzImages(user?.id);
 *
 *   return (
 *     <div>
 *       {showImages && <img src={challenge.imageUrl} />}
 *     </div>
 *   );
 * }
 * ```
 */
export function useDailyBuzzImages(userId?: string | null): FeatureFlagResult {
  return useFeatureFlag('daily_buzz_images', userId);
}
