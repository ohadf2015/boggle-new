/**
 * Hook to fetch a public player profile by ID
 */

import { useState, useEffect, useCallback } from 'react';
import type { PublicProfile } from '@/shared/types/publicProfile';

interface UsePublicProfileResult {
  profile: PublicProfile | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function usePublicProfile(playerId: string | undefined): UsePublicProfileResult {
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    if (!playerId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/player-profile/${encodeURIComponent(playerId)}`);
      if (!res.ok) {
        setError(res.status === 404 ? 'PLAYER_NOT_FOUND' : 'FETCH_ERROR');
        setProfile(null);
        return;
      }
      const data = await res.json();
      setProfile(data);
    } catch {
      setError('FETCH_ERROR');
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, [playerId]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  return { profile, loading, error, refetch: fetchProfile };
}
