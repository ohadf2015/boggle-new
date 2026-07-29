'use client';

/**
 * Game Providers - Extended provider stack for game pages
 *
 * ARCHITECTURE: This component wraps EssentialProviders and adds game-specific providers.
 * It does NOT recreate providers that are already in EssentialProviders (Theme, Language,
 * Auth, Music, SFX, Haptics, Accessibility, Motion, Navigation).
 *
 * This prevents duplicate provider instances which can cause issues like:
 * - Duplicate music playback (two MusicProvider instances = two Howl sets)
 * - State synchronization issues
 * - Memory leaks from unreleased audio resources
 *
 * IMPORTANT: When adding new providers:
 * - If needed on ALL pages → add to EssentialProviders
 * - If only needed on game pages → add to GameSpecificProviders below
 */

import React, { useEffect, ReactNode } from 'react';
import { AchievementQueueProvider } from '@/components/achievements';
import { GameAnnouncerProvider } from '@/components/GameAnnouncer';
import { NativeAppProvider } from '@/components/native/NativeAppProvider';
import { NetworkStatusHandler } from '@/components/native/NetworkStatusHandler';
import { SocketProvider } from '@/utils/SocketContext';
import { SocketEventBusProvider } from '@/contexts/SocketEventBusContext';
import { CrazyGamesSettingsBridge } from '@/components/CrazyGamesSettingsBridge';
import { composeProviders } from '@/utils/composeProviders';
import { initSessionTracking } from '@/utils/sessionTracking';
import { initializeHowlerConfig } from '@/lib/audio/howlerConfig';
import WinnerOnboardingWrapper from './components/WinnerOnboardingWrapper';
import ProfileCustomizationWrapper from './components/ProfileCustomizationWrapper';
import ComebackBonusWrapper from './components/ComebackBonusWrapper';
import BoostAckListener from '@/components/boosts/BoostAckListener';
import { EssentialProviders } from './essential-providers';

import type { Language } from '@/shared/types/game';

// Initialize React Scan for development performance monitoring
let reactScanInitialized = false;
const initReactScan = async () => {
    if (reactScanInitialized) return;
    if (typeof window === 'undefined') return;
    if (process.env.NODE_ENV !== 'development') return;
    if (process.env.NEXT_PUBLIC_ENABLE_REACT_SCAN !== 'true') return;

    reactScanInitialized = true;
    const { scan } = await import('react-scan');
    scan({
        enabled: true,
        log: true, // Log render info to console
    });
};

if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_ENABLE_REACT_SCAN === 'true') {
    initReactScan();
}

interface ProvidersProps {
  children: ReactNode;
  lang: Language;
}

// Initialize Howler.js global configuration immediately
// This MUST happen before any audio playback to prevent HTML5 audio pool exhaustion
// Fixes JAVASCRIPT-NEXTJS-9J: HTML5 Audio pool exhausted
let howlerConfigInitialized = false;
const initHowler = () => {
    if (howlerConfigInitialized) return;
    if (typeof window === 'undefined') return;

    howlerConfigInitialized = true;
    initializeHowlerConfig();
};

// Call immediately at module level - this runs before any audio context is created
if (typeof window !== 'undefined') {
    initHowler();
}

// Core game feature providers (achievements, announcer)
// Note: CoinProvider moved to EssentialProviders (needed on profile page for avatar purchases)
const CoreGameProviders = composeProviders([
    [GameAnnouncerProvider as React.ComponentType<{ children: ReactNode }>, {}],
    [AchievementQueueProvider as React.ComponentType<{ children: ReactNode }>, {}],
]);

interface GameSpecificProvidersProps {
    children: ReactNode;
}

/**
 * GameSpecificProviders - Providers needed only on game pages
 *
 * This component wraps children with game-specific providers:
 * - Network/Native handlers
 * - Socket.IO and game state
 * - Achievements, coins, and announcer
 *
 * IMPORTANT: This does NOT include EssentialProviders - it should be
 * rendered INSIDE EssentialProviders by ConditionalProviders.
 */
export function GameSpecificProviders({ children }: GameSpecificProvidersProps) {
    // CrazyGamesProvider is mounted globally in EssentialProviders so chrome on
    // every route reacts to embed status. SettingsBridge stays game-only — it
    // only matters once gameplay/audio are active.
    return (
        <NetworkStatusHandler>
            <NativeAppProvider>
                <CrazyGamesSettingsBridge>
                    <SocketProvider>
                        <SocketEventBusProvider>
                            <CoreGameProviders>
                                {children}
                                <WinnerOnboardingWrapper />
                                <ProfileCustomizationWrapper />
                                <ComebackBonusWrapper />
                                <BoostAckListener />
                            </CoreGameProviders>
                        </SocketEventBusProvider>
                    </SocketProvider>
                </CrazyGamesSettingsBridge>
            </NativeAppProvider>
        </NetworkStatusHandler>
    );
}

/**
 * Providers - Full provider stack for game pages (legacy export)
 *
 * NOTE: This is kept for backwards compatibility. New code should use
 * ConditionalProviders which properly handles the provider hierarchy.
 *
 * ARCHITECTURE: Wraps EssentialProviders to reuse base providers and adds
 * game-specific providers via GameSpecificProviders.
 */
export function Providers({ children, lang }: ProvidersProps) {
    // Initialize session tracking for analytics
    // Note: This may run twice (once in EssentialProviders, once here) but
    // initSessionTracking() is idempotent so that's fine
    useEffect(() => {
        initSessionTracking();
    }, []);

    return (
        <EssentialProviders lang={lang}>
            <GameSpecificProviders>
                {children}
            </GameSpecificProviders>
        </EssentialProviders>
    );
}
