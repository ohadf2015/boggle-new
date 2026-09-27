'use client';

/**
 * LogRocketIdentify — Renderless component that identifies the user
 * in LogRocket whenever auth state changes.
 *
 * Must be mounted inside AuthProvider.
 */

import { useLogRocketIdentify } from '@/hooks/useLogRocketIdentify';

export function LogRocketIdentify(): null {
  useLogRocketIdentify();
  return null;
}
