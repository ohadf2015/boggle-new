'use client';

import { usePostHogFlag } from './usePostHogFlag';

const FLAG_KEY = 'offline-mode';

export function useOfflineModeFlag(): boolean {
  const remote = usePostHogFlag<boolean>(FLAG_KEY, false);
  const devOverride = process.env.NEXT_PUBLIC_OFFLINE_DEV === '1';
  return devOverride || remote === true;
}
