import { useEffect, useMemo, useState } from 'react';
import { getChartData, type GameHistoryEntry, type PerformanceTrend } from '@/utils/gameHistoryManager';

interface SparklineTrendResult {
  sparklineScores: number[];
  trend: PerformanceTrend | null;
  hasSparkline: boolean;
}

/**
 * Shared hook for sparkline data + trend calculation.
 *
 * Used by ResultsInfoCards to avoid duplicating
 * the getChartData fetch, currentScore dedup, and trend math.
 *
 * @param currentScore - The current game's score (appended if not already in history)
 * @param maxGames - How many historical games to fetch (default 8)
 */
export function useSparklineTrend(currentScore?: number, maxGames = 8): SparklineTrendResult {
  const [chartData, setChartData] = useState<GameHistoryEntry[]>([]);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    setChartData(getChartData(maxGames));
  }, [maxGames]);

  // Build sparkline scores, appending currentScore if not already the last entry
  const sparklineScores = useMemo(() => {
    const scores = chartData.map(d => d.score);
    if (currentScore === undefined) return scores;
    if (scores[scores.length - 1] === currentScore) return scores;
    return [...scores, currentScore];
  }, [chartData, currentScore]);

  // Calculate trend: compare last score vs average of previous scores
  const trend = useMemo((): PerformanceTrend | null => {
    if (sparklineScores.length < 2) return null;

    const last = sparklineScores[sparklineScores.length - 1];
    const prev = sparklineScores.slice(0, -1);
    const avg = prev.reduce((a, b) => a + b, 0) / prev.length;
    const rawPct = avg > 0 ? ((last - avg) / avg) * 100 : 0;
    const pct = Math.max(-999, Math.min(999, rawPct));
    const dir: PerformanceTrend['direction'] =
      pct > 10 ? 'up' : pct < -10 ? 'down' : 'stable';

    return {
      direction: dir,
      percentChange: Math.round(pct),
      averageScore: Math.round(avg),
      bestScore: Math.max(...sparklineScores),
      totalGames: sparklineScores.length,
      recentAverage: last,
    };
  }, [sparklineScores]);

  return {
    sparklineScores,
    trend,
    hasSparkline: isClient && sparklineScores.length >= 2,
  };
}
