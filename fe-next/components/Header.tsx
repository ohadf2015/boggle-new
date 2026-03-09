import { memo, useCallback, useState } from 'react';
import dynamic from 'next/dynamic';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';
import { useSafeArea } from '@/hooks/useSafeArea';
import { useGiftNotifications } from './header/useGiftNotifications';
import HeaderLogo from './header/HeaderLogo';
import HeaderDesktopControls from './header/HeaderDesktopControls';
import HeaderMobileMenu from './header/HeaderMobileMenu';

const AuthModal = dynamic(() => import('./auth/AuthModal'), { ssr: false });
const AdminGiftModal = dynamic(() => import('./gift/AdminGiftModal').then(m => m.AdminGiftModal), { ssr: false });

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
        <header
            className={cn(
                "w-full mb-1 sm:mb-2 lg:mb-3 px-2 sm:px-3 lg:px-4 pb-1 lg:pb-2",
                "sticky top-0 lg:static",
                "z-[60] bg-slate-50 dark:bg-slate-900",
                "min-h-[60px] sm:min-h-[70px] lg:min-h-[80px]",
                className
            )}
            style={{
                paddingTop: safeArea.top > 0 ? `${safeArea.top + 8}px` : undefined,
            }}
        >
            {/* NEO-BRUTALIST Header Bar */}
            <div
                className={cn(
                    "w-full mx-auto",
                    "flex items-center justify-between",
                    "px-2 sm:px-3 lg:px-4 py-2 sm:py-2 lg:py-2.5",
                    "bg-neo-white/90 dark:bg-neo-navy",
                    "backdrop-blur-md",
                    "border-4 lg:border-4 xl:border-4 2xl:border-4 border-neo-black",
                    "shadow-hard-lg xl:shadow-hard-lg 2xl:shadow-hard-lg",
                    "rounded-neo-lg xl:rounded-neo-lg 2xl:rounded-neo-lg",
                    "transition-all duration-100",
                    "min-w-0"
                )}
            >
                <HeaderLogo />

                <HeaderDesktopControls
                    unclaimedCount={unclaimedCount}
                    onOpenGiftModal={handleOpenGiftModal}
                />

                <HeaderMobileMenu
                    unclaimedCount={unclaimedCount}
                    onOpenGiftModal={handleOpenGiftModal}
                    onSignIn={openSignIn}
                    onSignUp={openSignUp}
                />
            </div>

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
    );
});

Header.displayName = 'Header';

export default Header;
