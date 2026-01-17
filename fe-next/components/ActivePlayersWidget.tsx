'use client';

import { useState, useEffect } from 'react';
import { Users } from 'lucide-react';
import { motion } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';

interface ActivePlayersResponse {
  count: number;
  timestamp: string;
  error?: string;
}

/**
 * Active Players Widget - Social Proof Component
 *
 * Displays count of currently active players to create FOMO and social proof.
 * Updates every 30 seconds to show fresh data.
 *
 * Features:
 * - Auto-refresh every 30s
 * - Animated count transitions
 * - Neo-brutalist design matching LexiClash theme
 * - i18n support
 */
export function ActivePlayersWidget() {
  const { t } = useLanguage();
  const [playerCount, setPlayerCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  const fetchActivePlayersCount = async () => {
    try {
      const response = await fetch('/api/analytics/active-players');
      const data: ActivePlayersResponse = await response.json();

      if (!data.error && data.count !== undefined) {
        setPlayerCount(data.count);
      }
      setIsLoading(false);
    } catch (error) {
      console.error('Failed to fetch active players count:', error);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Initial fetch
    fetchActivePlayersCount();

    // Refresh every 30 seconds
    const intervalId = setInterval(fetchActivePlayersCount, 30000);

    return () => clearInterval(intervalId);
  }, []);

  // Don't show widget if count is 0 or still loading
  if (isLoading || playerCount === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="inline-flex items-center gap-2 px-3 py-2 bg-neo-lime border-3 border-neo-black rounded-neo shadow-hard-sm"
    >
      {/* Animated pulse dot */}
      <div className="relative flex h-3 w-3">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neo-black opacity-75"></span>
        <span className="relative inline-flex rounded-full h-3 w-3 bg-neo-black"></span>
      </div>

      {/* Icon */}
      <Users size={16} className="text-neo-black" />

      {/* Count with animated transitions */}
      <motion.span
        key={playerCount}
        initial={{ scale: 1.2, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.2 }}
        className="font-black text-neo-black text-sm"
      >
        {playerCount.toLocaleString()}+
      </motion.span>

      {/* Label */}
      <span className="font-bold text-neo-black text-xs uppercase">
        {t('landing.playingNow') || 'Playing Now'}
      </span>
    </motion.div>
  );
}

export default ActivePlayersWidget;
