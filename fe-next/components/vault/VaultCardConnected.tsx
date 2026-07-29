'use client';

/**
 * VaultCardConnected
 *
 * Self-contained wrapper that connects useVaultBoard hook to VaultCard.
 * Returns null when loading or no vault data is available.
 */

import { useRouter } from 'next/navigation';
import { useVaultBoard } from '@/hooks/useVaultBoard';
import { useLanguage } from '@/contexts/LanguageContext';
import VaultCard from './VaultCard';

export function VaultCardConnected() {
  const router = useRouter();
  const { language } = useLanguage();
  const { vault, leaderboard, timeRemaining, isActive, loading } = useVaultBoard();

  if (loading || !vault) return null;

  const handleEnter = () => {
    router.push(`/${language}/vault`);
  };

  return (
    <VaultCard
      vault={vault}
      leaderboard={leaderboard}
      timeRemaining={timeRemaining}
      isActive={isActive}
      onEnter={handleEnter}
    />
  );
}
