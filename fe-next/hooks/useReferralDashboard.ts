import { useState, useCallback, useEffect, useRef } from 'react';

export interface ReferralMilestoneData {
  id: string;
  label: string;
  threshold: number;
  coins: number;
  reached: boolean;
}

export interface ReferralEntry {
  id: string;
  referredId: string;
  createdAt: string;
  rewardGranted: boolean;
  gamesPlayed: number;
  username: string | null;
  displayName: string | null;
  avatarEmoji: string | null;
  avatarColor: string | null;
  status: 'active' | 'invited' | 'inactive';
}

export interface ReferralDashboardData {
  referralCode: string;
  shareUrl: string;
  totalInvited: number;
  totalJoined: number;
  totalActive: number;
  coinsEarned: number;
  referralRewardXp: number;
  milestones: ReferralMilestoneData[];
  referrals: ReferralEntry[];
}

interface UseReferralDashboardReturn {
  data: ReferralDashboardData | null;
  isLoading: boolean;
  error: string | null;
  copied: boolean;
  handleCopy: () => Promise<void>;
  refresh: () => Promise<void>;
}

export function useReferralDashboard(): UseReferralDashboardReturn {
  const [data, setData] = useState<ReferralDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
    };
  }, []);

  const fetchStats = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/referral/stats');
      if (!res.ok) {
        if (res.status === 401) {
          setError('unauthorized');
          return;
        }
        throw new Error('Failed to fetch referral stats');
      }
      const result = await res.json();
      if (result.success) {
        setData(result.data);
      } else {
        throw new Error(result.error || 'Unknown error');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('Error fetching referral stats:', msg);
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handleCopy = useCallback(async () => {
    if (!data?.shareUrl) return;
    try {
      await navigator.clipboard.writeText(data.shareUrl);
      setCopied(true);
      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
      copiedTimerRef.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard unavailable
    }
  }, [data?.shareUrl]);

  return { data, isLoading, error, copied, handleCopy, refresh: fetchStats };
}
