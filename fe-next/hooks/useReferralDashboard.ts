import { useState, useCallback, useRef, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { queryKeys } from '@/lib/queryKeys';
import { fetchWithAuth } from '@/utils/authFetch';

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

async function fetchReferralStats(): Promise<ReferralDashboardData> {
  const res = await fetchWithAuth('/api/referral/stats');
  if (!res.ok) {
    if (res.status === 401) throw new Error('unauthorized');
    throw new Error('Failed to fetch referral stats');
  }
  const result = await res.json();
  if (result.success) return result.data;
  throw new Error(result.error || 'Unknown error');
}

export function useReferralDashboard(): UseReferralDashboardReturn {
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();
  const [copied, setCopied] = useState(false);
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
    };
  }, []);

  const { data = null, isLoading, error: queryError } = useQuery<ReferralDashboardData>({
    queryKey: queryKeys.referral.stats(),
    queryFn: fetchReferralStats,
    staleTime: 5 * 60_000,
    enabled: !!isAuthenticated,
  });

  const error = queryError ? (queryError instanceof Error ? queryError.message : String(queryError)) : null;

  const shareUrl = data?.shareUrl ?? null;

  const handleCopy = useCallback(async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
      copiedTimerRef.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard unavailable
    }
  }, [shareUrl]);

  const refresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.referral.stats() });
  }, [queryClient]);

  return { data, isLoading, error, copied, handleCopy, refresh };
}
