import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getCoins, addCoins as addLocalCoins, spendCoins as spendLocalCoins } from '@/utils/coinManager';
import { syncCoinsToDatabase, spendCoinsFromDatabase, getProfile } from '@/lib/supabase';
import toast from 'react-hot-toast';

/**
 * useCoins Hook
 * 
 * Unifies coin management for both authenticated and guest users.
 * - Authenticated: Uses `profile.total_coins` and syncs with Supabase.
 * - Guest: Uses `localStorage` via `coinManager`.
 */
export function useCoins() {
    const { user, profile, isAuthenticated, refreshProfile } = useAuth();

    // Local state for guests or immediate updates
    const [localCoins, setLocalCoins] = useState<number>(0);

    // Initialize local coins on mount (for guests)
    useEffect(() => {
        if (!isAuthenticated) {
            setLocalCoins(getCoins());
        }
    }, [isAuthenticated]);

    // Determine effective coin balance
    // Handle loading state: if user exists but profile not loaded yet, return 0
    // (prevents using guest localCoins for authenticated users during profile load)
    // Once profile loads, use profile.total_coins; for guests, use localCoins
    const coins = user
        ? (profile?.total_coins ?? 0) // Return 0 during profile loading for authenticated users
        : localCoins; // Guest users use localStorage

    /**
     * Refreshes the coin balance
     * - Auth: Refreshes profile from DB and returns fresh balance
     * - Guest: Re-reads from localStorage
     * @returns The new coin balance after refresh
     */
    const refreshCoins = useCallback(async (): Promise<number> => {
        if (isAuthenticated && user?.id) {
            // Refresh profile in context for UI updates
            await refreshProfile();
            // Also fetch profile directly to get fresh value immediately (avoids stale closure)
            const { data: freshProfile } = await getProfile(user.id);
            return freshProfile?.total_coins ?? 0;
        } else {
            const newBalance = getCoins();
            setLocalCoins(newBalance);
            return newBalance;
        }
    }, [isAuthenticated, user, refreshProfile]);

    /**
     * Check if user can afford an amount
     */
    const canAfford = useCallback((amount: number) => {
        return coins >= amount;
    }, [coins]);

    /**
     * Add coins to balance
     */
    const addCoins = useCallback(async (
        amount: number,
        reason: string,
        metadata?: Record<string, string | number>
    ) => {
        if (amount <= 0) return 0;

        if (isAuthenticated && user) {
            // Authenticated: Sync to DB
            const result = await syncCoinsToDatabase(user.id, amount, reason, metadata);

            if (result.success) {
                // Refresh profile to update UI with new balance
                await refreshProfile();
                // Also fetch fresh profile to get the actual updated value
                const { data: freshProfile } = await getProfile(user.id);
                return freshProfile?.total_coins ?? result.newBalance ?? (coins + amount);
            } else {
                console.error('Failed to add coins:', result.error);
                toast.error('Failed to update coin balance');
                return coins;
            }
        } else {
            // Guest: Update localStorage
            const newTotal = addLocalCoins(amount, reason, metadata);
            setLocalCoins(newTotal);
            return newTotal;
        }
    }, [isAuthenticated, user, coins, refreshProfile]);

    /**
     * Spend coins from balance
     * Returns true if successful, false otherwise
     */
    const spendCoins = useCallback(async (
        amount: number,
        reason: string,
        metadata?: Record<string, string | number>
    ) => {
        if (!canAfford(amount)) return false;

        if (isAuthenticated && user) {
            // Authenticated: Spend from DB
            const result = await spendCoinsFromDatabase(user.id, amount, reason, metadata);

            if (result.success) {
                // Refresh profile to update UI with new balance
                await refreshProfile();
                // Fetch fresh profile to ensure UI updates immediately
                await getProfile(user.id);
                return true;
            } else {
                console.error('Failed to spend coins:', result.error);
                toast.error('Failed to process transaction');
                return false;
            }
        } else {
            // Guest: Spend from localStorage
            const success = spendLocalCoins(amount, reason, metadata);
            if (success) {
                setLocalCoins(getCoins());
            }
            return success;
        }
    }, [isAuthenticated, user, canAfford, refreshProfile]);

    return {
        coins,
        canAfford,
        addCoins,
        spendCoins,
        refreshCoins
    };
}
