'use client';

import { useState, useCallback } from 'react';
import { useCrazyGames, type CrazyGamesFriend } from '@/components/CrazyGamesSDK';
import logger from '@/utils/logger';

interface UseCrazyGamesFriendsReturn {
  /** List of loaded friends */
  friends: CrazyGamesFriend[];
  /** Whether there are more friends to load */
  hasMore: boolean;
  /** Whether a request is in progress */
  isLoading: boolean;
  /** Load the next page of friends */
  loadMore: () => Promise<void>;
  /** Reset and reload from first page */
  refresh: () => Promise<void>;
}

/**
 * Hook for CrazyGames friends list integration.
 *
 * Provides paginated access to the player's CrazyGames friends.
 * Rate limited to 1 call per 250ms by the SDK.
 *
 * @example
 * ```tsx
 * const { friends, hasMore, loadMore, isLoading } = useCrazyGamesFriends();
 *
 * return (
 *   <div>
 *     {friends.map(f => <FriendRow key={f.id} friend={f} />)}
 *     {hasMore && <button onClick={loadMore} disabled={isLoading}>Load More</button>}
 *   </div>
 * );
 * ```
 */
export function useCrazyGamesFriends(): UseCrazyGamesFriendsReturn {
  const { isAvailable, listFriends } = useCrazyGames();

  const [friends, setFriends] = useState<CrazyGamesFriend[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(0);

  const PAGE_SIZE = 50;

  const loadMore = useCallback(async () => {
    if (!isAvailable || isLoading || !hasMore) return;

    setIsLoading(true);
    try {
      const result = await listFriends(page, PAGE_SIZE);
      setFriends(prev => [...prev, ...result.friends]);
      setHasMore(result.hasMore);
      setPage(prev => prev + 1);
    } catch (error) {
      logger.debug('Failed to load CrazyGames friends:', error instanceof Error ? error.message : JSON.stringify(error));
    } finally {
      setIsLoading(false);
    }
  }, [isAvailable, isLoading, hasMore, page, listFriends]);

  const refresh = useCallback(async () => {
    if (!isAvailable) return;

    setFriends([]);
    setPage(0);
    setHasMore(true);
    setIsLoading(true);

    try {
      const result = await listFriends(0, PAGE_SIZE);
      setFriends(result.friends);
      setHasMore(result.hasMore);
      setPage(1);
    } catch (error) {
      logger.debug('Failed to refresh CrazyGames friends:', error instanceof Error ? error.message : JSON.stringify(error));
    } finally {
      setIsLoading(false);
    }
  }, [isAvailable, listFriends]);

  return {
    friends,
    hasMore,
    isLoading,
    loadMore,
    refresh,
  };
}

export default useCrazyGamesFriends;
