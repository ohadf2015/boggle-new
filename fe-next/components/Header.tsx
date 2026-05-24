'use client';

import { memo, useCallback, useState } from 'react';
import dynamic from 'next/dynamic';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';
import { useSafeArea } from '@/hooks/useSafeArea';
import { useGiftNotifications } from './header/useGiftNotifications';
import HeaderLogo from './header/HeaderLogo';
import HeaderBackButton from './header/HeaderBackButton';
import HeaderDesktopControls from './header/HeaderDesktopControls';
import HeaderMobileMenu from './header/HeaderMobileMenu';

const AuthModal = dynamic(() => import('./auth/AuthModal'), { ssr: false });
const AdminGiftModal = dynamic(() => import('./gift/AdminGiftModal').then(m => m.AdminGiftModal), { ssr: false });
const LeaguePositionBadge = dynamic(() => import('@/components/leagues/LeaguePositionBadge').then(m => m.LeaguePositionBadge), { ssr: false });
// Dynamic — DesktopGameNav uses navigation/CrazyGames/veteran hooks; matches the
// pattern of other sub-components above and keeps Header unit tests insulated.
const DesktopGameNav = dynamic(() => import('./DesktopGameNav'), { ssr: false });

interface HeaderProps {
    className?: string;
}

const Header = memo<HeaderProps>(({ className = '' }) => {
    const { profile } = useAuth();
    const safeArea = useSafeArea();
    const {
        unclaimedCount,
        showGiftModal,
        selectedGift,
        handleOpenGiftModal,
        handleClaimGift,
        handleDismissGiftModal,
    } = useGiftNotifications();

    // Auth Modal State
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [authModalMode, setAuthModalMode] = useState<'signin' | 'signup'>('signin');

    const openSignIn = useCallback(() => {
        setAuthModalMode('signin');
        setShowAuthModal(true);
    }, []);

    const openSignUp = useCallback(() => {
        setAuthModalMode('signup');
        setShowAuthModal(true);
    }, []);

    return (
        <>
            {/* Invisible spacer sibling — reserves flow space for the fixed header.
                Classic "fixed header + spacer" pattern: avoids the `position: sticky`
                failure modes when ancestors use overflow/flex-centering. Mirrors the
                header's responsive height + safe-area top inset. */}
            <div
                aria-hidden="true"
                className={cn(
                    "h-header pb-1 lg:pb-2 short:pb-0 medium-short:pb-0.5",
                    // md+ adds DesktopGameNav (~44px) into the same fixed band, so
                    // the spacer must clear bar + nav. min-height wins over h-header.
                    "min-h-[60px] sm:min-h-[70px] md:min-h-[114px] lg:min-h-[124px] short:min-h-[44px] medium-short:min-h-[52px] md:short:min-h-[48px] lg:short:min-h-[52px] desktop-short:lg:min-h-[56px] desktop-medium-short:lg:min-h-[80px]"
                )}
                style={{
                    paddingTop: safeArea.top > 0 ? `${safeArea.top}px` : undefined,
                }}
            />
            <header
                className={cn(
                    "pb-1 lg:pb-2 short:pb-0 medium-short:pb-0.5",
                    // Always fixed so it cannot silently lose its flow slot when an
                    // ancestor has overflow/flex-centering (which breaks `sticky`).
                    // Flow space is reserved by the sibling spacer div above.
                    "fixed top-0 left-0 right-0",
                    "z-[60] bg-slate-50 dark:bg-slate-900",
                    "min-h-[60px] sm:min-h-[70px] md:min-h-[114px] lg:min-h-[124px] short:min-h-[44px] medium-short:min-h-[52px] md:short:min-h-[48px] lg:short:min-h-[52px] desktop-short:lg:min-h-[56px] desktop-medium-short:lg:min-h-[80px]",
                    className
                )}
                style={{
                    paddingTop: safeArea.top > 0 ? `${safeArea.top}px` : undefined,
                }}
            >
            {/* NEO-BRUTALIST Header Bar */}
            <div
                className={cn(
                    "w-full mx-auto",
                    "flex items-center justify-between",
                    "px-2 sm:px-3 lg:px-4 py-2 sm:py-2 lg:py-2.5 short:py-1 medium-short:py-1.5 desktop-short:lg:py-1.5",
                    "bg-neo-white/90 dark:bg-neo-navy",
                    "backdrop-blur-xs",
                    "border-b-4 border-neo-black",
                    "transition-all duration-100",
                    "min-w-0"
                )}
            >
                <div className="flex items-center gap-2 min-w-0">
                    <HeaderBackButton />
                    <HeaderLogo />
                    {/* Compact league badge — constant awareness without clutter */}
                    <div className="hidden sm:block"><LeaguePositionBadge /></div>
                </div>

                {/* Right cluster: desktop strip (sm+) + side-menu trigger.
                    Wrapped so justify-between treats them as a single end-aligned
                    block, keeping the burger adjacent to the desktop controls. */}
                <div className="flex items-center gap-2 shrink-0">
                    <HeaderDesktopControls
                        unclaimedCount={unclaimedCount}
                        onOpenGiftModal={handleOpenGiftModal}
                        onSignIn={openSignIn}
                        onSignUp={openSignUp}
                    />

                    <HeaderMobileMenu
                        unclaimedCount={unclaimedCount}
                        onOpenGiftModal={handleOpenGiftModal}
                        onSignIn={openSignIn}
                        onSignUp={openSignUp}
                    />
                </div>
            </div>

            {/* Desktop game-mode tabs share the fixed header band so they aren't
                overlaid by Header (z-60) when mounted separately in the layout. */}
            <DesktopGameNav />

            <AuthModal
                isOpen={showAuthModal}
                onClose={() => setShowAuthModal(false)}
                showGuestStats={true}
                initialMode={authModalMode}
            />

            <AdminGiftModal
                gift={selectedGift}
                show={showGiftModal}
                onClaim={handleClaimGift}
                onDismiss={handleDismissGiftModal}
                currentXp={profile?.total_xp || 0}
                currentCoins={profile?.total_coins || 0}
            />
            </header>
        </>
    );
});

Header.displayName = 'Header';

export default Header;
