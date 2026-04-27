'use client';

/**
 * useBoostAckListener
 *
 * Listens for the server `boost:applied` ack and surfaces a success toast so
 * the player gets explicit confirmation a boost was registered for the game.
 * Solves the prior UX gap where boosts were silently accepted (or silently
 * lost) with no in-game indication.
 *
 * Mount once near the top of the game-session provider tree.
 */

import { useEffect } from 'react';
import { useSocketOptional } from '@/utils/SocketContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { neoSuccessToast, TOAST_ICONS } from '@/components/NeoToast';

const KNOWN_BOOST_TYPES = new Set([
  'freezeTime',
  'hint',
  'scoreMultiplier',
  'firstWordBonus',
]);

interface BoostAppliedPayload {
  success: boolean;
  boostType?: string;
}

export function useBoostAckListener(): void {
  const ctx = useSocketOptional();
  const { t } = useLanguage();
  const socket = ctx?.socket ?? null;

  useEffect(() => {
    if (!socket) return;

    const handler = (raw: unknown) => {
      const data = raw as BoostAppliedPayload;
      if (!data?.success) return;
      const type = data.boostType;
      if (!type || !KNOWN_BOOST_TYPES.has(type)) return;

      const title = t(`boosts.${type}.title`);
      neoSuccessToast(t('boosts.activated', { boost: title }), {
        icon: TOAST_ICONS.sparkles,
        duration: 3500,
      });
    };

    socket.on('boost:applied', handler);
    return () => {
      socket.off('boost:applied', handler);
    };
  }, [socket, t]);
}
