import { useCallback, useEffect, useRef, useState } from 'react';
import { useUnclaimedGifts } from '@/hooks/useUnclaimedGifts';
import { useAuth } from '../../contexts/AuthContext';

export function useGiftNotifications() {
    const { profile, refreshProfile } = useAuth();
    const { unclaimedCount, gifts, refresh: refreshGifts, claimGift } = useUnclaimedGifts();
    const [showGiftModal, setShowGiftModal] = useState(false);
    const [selectedGift, setSelectedGift] = useState<typeof gifts[0] | null>(null);
    // Track which gift IDs have been auto-shown this session to prevent re-showing
    // Note: Cross-session persistence is handled by profile.gift_modal_dismissed_at in DB
    const autoShownGiftIdsRef = useRef<Set<string>>(new Set());
    // Track which gift IDs have been dismissed this session (user clicked X without claiming)
    // Note: Dismissal is immediately persisted to DB via /api/player/gifts/dismiss-modal
    const dismissedGiftIdsRef = useRef<Set<string>>(new Set());

    // Handle opening gift modal with oldest unclaimed gift
    const handleOpenGiftModal = useCallback(() => {
        const unclaimedGift = gifts.find(g => !g.claimed);
        if (unclaimedGift) {
            setSelectedGift(unclaimedGift);
            setShowGiftModal(true);
        }
    }, [gifts]);

    // Handle claiming a gift
    const handleClaimGift = useCallback(async (giftId: string) => {
        await claimGift(giftId);
        await Promise.all([
            refreshGifts(),
            refreshProfile(),
        ]);
    }, [claimGift, refreshGifts, refreshProfile]);

    // Handle dismissing gift modal - show next unclaimed gift if available
    // Persist dismissal to database IMMEDIATELY to prevent auto-showing in future sessions/pages
    const handleDismissGiftModal = useCallback(async () => {
        if (selectedGift?.id) {
            dismissedGiftIdsRef.current.add(selectedGift.id);
        }

        // Persist dismissal to database IMMEDIATELY (fire-and-forget)
        fetch('/api/player/gifts/dismiss-modal', {
            method: 'POST',
        }).then(() => {
            refreshProfile();
        }).catch(error => {
            console.error('Failed to persist gift modal dismissal:', error);
        });

        // Find the next unclaimed gift (excluding the currently selected one and dismissed ones)
        const nextUnclaimedGift = gifts.find(g =>
            !g.claimed &&
            g.id !== selectedGift?.id &&
            !dismissedGiftIdsRef.current.has(g.id)
        );

        if (nextUnclaimedGift) {
            setSelectedGift(nextUnclaimedGift);
        } else {
            setShowGiftModal(false);
            setSelectedGift(null);
        }
    }, [gifts, selectedGift, refreshProfile]);

    // Listen for openGiftModal events dispatched by NotificationBell
    useEffect(() => {
        const handleOpenGiftModal = async (e: Event) => {
            const giftId = (e as CustomEvent).detail?.giftId;

            // If we have a specific gift ID, try local first then fetch
            if (giftId) {
                const localGift = gifts.find(g => g.id === giftId);
                if (localGift) {
                    setSelectedGift(localGift);
                    setShowGiftModal(true);
                    return;
                }
                // Gift not in local unclaimed list — fetch by ID (may be already claimed)
                try {
                    const res = await fetch(`/api/player/gifts/${giftId}`);
                    if (res.ok) {
                        const data = await res.json();
                        if (data.gift) {
                            setSelectedGift(data.gift);
                            setShowGiftModal(true);
                            return;
                        }
                    }
                } catch (err) {
                    console.error('Failed to fetch gift by ID:', err);
                }
            }

            // Fallback: open oldest unclaimed gift
            const unclaimedGift = gifts.find(g => !g.claimed);
            if (unclaimedGift) {
                setSelectedGift(unclaimedGift);
                setShowGiftModal(true);
            } else {
                refreshGifts();
            }
        };
        window.addEventListener('openGiftModal', handleOpenGiftModal);
        return () => window.removeEventListener('openGiftModal', handleOpenGiftModal);
    }, [gifts, refreshGifts]);

    // Auto-show gift modal after 3 seconds when user has unclaimed gifts
    useEffect(() => {
        if (showGiftModal || gifts.length === 0) return;

        const dismissedAt = profile?.gift_modal_dismissed_at
            ? new Date(profile.gift_modal_dismissed_at).getTime()
            : 0;

        const eligibleGift = gifts.find(g => {
            if (g.claimed) return false;
            if (autoShownGiftIdsRef.current.has(g.id)) return false;
            if (dismissedGiftIdsRef.current.has(g.id)) return false;
            if (dismissedAt > 0) {
                const giftCreatedAt = new Date(g.created_at).getTime();
                return giftCreatedAt > dismissedAt;
            }
            return true;
        });

        if (!eligibleGift) return;

        const timer = setTimeout(() => {
            autoShownGiftIdsRef.current.add(eligibleGift.id);
            setSelectedGift(eligibleGift);
            setShowGiftModal(true);
        }, 3000);

        return () => clearTimeout(timer);
    }, [gifts, showGiftModal, profile?.gift_modal_dismissed_at]);

    // Dispatch event when gift modal opens/closes to allow games to pause
    useEffect(() => {
        if (typeof window === 'undefined') return;
        window.dispatchEvent(new CustomEvent('giftModalStateChange', {
            detail: { isOpen: showGiftModal }
        }));
    }, [showGiftModal]);

    return {
        unclaimedCount,
        showGiftModal,
        selectedGift,
        handleOpenGiftModal,
        handleClaimGift,
        handleDismissGiftModal,
    };
}
