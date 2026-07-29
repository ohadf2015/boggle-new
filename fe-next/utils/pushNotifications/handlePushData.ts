import type { QueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';

export const PUSH_RECEIVED_EVENT = 'lexiclash:push-received';

/**
 * Handles a push notification data payload received while the app is in the
 * foreground. Ensures in-app state stays in sync with the tray notification.
 *
 * Why: the Capacitor push listener bridges to LocalNotifications for tray
 * visibility, but React Query caches (useUnclaimedGifts has 5-min staleTime)
 * would otherwise lag behind by minutes — making the gift/message feel absent.
 */
export function handlePushData(
  queryClient: QueryClient,
  data: Record<string, string>
): void {
  if (!data || typeof data !== 'object') return;

  switch (data.type) {
    case 'gift':
    case 'gift_received':
      queryClient.invalidateQueries({ queryKey: queryKeys.gifts._def });
      break;
    default:
      break;
  }

  if (typeof window !== 'undefined' && Object.keys(data).length > 0) {
    try {
      window.dispatchEvent(new CustomEvent(PUSH_RECEIVED_EVENT, { detail: data }));
    } catch {
      // noop — older runtimes without CustomEvent
    }
  }
}
