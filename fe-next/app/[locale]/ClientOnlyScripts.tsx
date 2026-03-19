'use client';

import dynamic from 'next/dynamic';

const GoogleConsentMode = dynamic(() => import('@/components/GoogleConsentMode'), { ssr: false });
const GoogleAnalytics = dynamic(() => import('@/components/GoogleAnalytics'), { ssr: false });
const GoogleAdSense = dynamic(() => import('@/components/GoogleAdSense'), { ssr: false });
const CrazyGamesScript = dynamic(() => import('@/components/CrazyGamesSDK').then(m => m.CrazyGamesScript), { ssr: false });
const WebVitalsReporter = dynamic(() => import('@/components/WebVitalsReporter'), { ssr: false });
const PWAInstallPrompt = dynamic(() => import('@/components/PWAInstallPrompt'), { ssr: false });
const ServiceWorkerRegistration = dynamic(() => import('@/components/ServiceWorkerRegistration'), { ssr: false });
const VersionChecker = dynamic(() => import('@/components/VersionChecker'), { ssr: false });
const NewYearCountdown = dynamic(() => import('@/components/celebration/NewYearCountdown'), { ssr: false });
const AnimationsLoader = dynamic(() => import('@/components/AnimationsLoader'), { ssr: false });
const DeepLinkHandler = dynamic(() => import('@/components/DeepLinkHandler'), { ssr: false });
const NativeOAuthInitializer = dynamic(() => import('@/components/NativeOAuthInitializer'), { ssr: false });
const EmailCaptureModal = dynamic(() => import('@/components/EmailCaptureModal'), { ssr: false });
const CookieConsent = dynamic(() => import('@/components/CookieConsent'), { ssr: false });

/** Client-only scripts rendered before providers (consent, analytics, SW, etc.) */
export function PreProviderScripts() {
    return (
        <>
            <GoogleConsentMode />
            <GoogleAnalytics />
            <GoogleAdSense />
            <CrazyGamesScript />
            <WebVitalsReporter />
            <ServiceWorkerRegistration />
            <AnimationsLoader />
            <DeepLinkHandler />
            <NativeOAuthInitializer />
        </>
    );
}

/** Client-only components rendered inside providers */
export function PostProviderScripts() {
    return (
        <>
            <VersionChecker />
            <PWAInstallPrompt />
            <EmailCaptureModal />
            <NewYearCountdown />
            <CookieConsent />
        </>
    );
}
