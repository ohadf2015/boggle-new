'use client';

/**
 * Post-landing chrome that used to be statically imported from the locale
 * layout — ads, pixels, native OAuth, dictionary warmup, SW, offline, One Tap.
 * Static imports put those modules in every `/en` first-paint script list
 * (~163KB layout chunk + dozens of extra webpack ids). This client module is
 * next/dynamic'd from the layout and only rendered when the path is NOT the
 * locale-root landing, so Lighthouse /en never downloads it.
 */

import type { ReactNode } from 'react';
import GoogleConsentMode from '@/components/GoogleConsentMode';
import GoogleAnalytics from '@/components/GoogleAnalytics';
import AdSenseLoader from '@/components/ads/AdSenseLoader';
import WebAnchorAdObserver from '@/components/ads/WebAnchorAdObserver';
import WebVitalsReporter from '@/components/WebVitalsReporter';
import PagePresenceReporter from '@/components/PagePresenceReporter';
import ServiceWorkerRegistration from '@/components/ServiceWorkerRegistration';
import AnimationsLoader from '@/components/AnimationsLoader';
import DictionaryPrewarmer from '@/components/DictionaryPrewarmer';
import NativeOAuthInitializer from '@/components/NativeOAuthInitializer';
import NativePGSInitializer from '@/components/NativePGSInitializer';
import GoogleOneTapInitializer from '@/components/auth/GoogleOneTapInitializer';
import CrazyGamesScriptServer from '@/components/CrazyGamesScriptServer';
import { OfflineBanner } from '@/components/offline/OfflineBanner';
import { OfflineSyncBridge } from '@/components/offline/OfflineSyncBridge';
import InGameAudioButton from '@/components/InGameAudioButton';
import FeedbackDevtoolsWidget from '@/components/feedback/FeedbackDevtoolsWidget';
import nextDynamic from 'next/dynamic';
import type { Language } from '@/shared/types/game';

const DeferredLayoutWidgets = nextDynamic(() => import('@/components/DeferredLayoutWidgets'), {
  loading: () => null,
  ssr: false,
});
const SocialMediaPixels = nextDynamic(() => import('@/components/SocialMediaPixels'), {
  loading: () => null,
  ssr: false,
});

export default function LocaleDeferredChrome({ lang }: { lang: Language }): ReactNode {
  return (
    <>
      <GoogleConsentMode />
      <GoogleAnalytics />
      <AdSenseLoader />
      <WebAnchorAdObserver />
      <SocialMediaPixels />
      <WebVitalsReporter />
      <PagePresenceReporter />
      <ServiceWorkerRegistration />
      <AnimationsLoader />
      <DictionaryPrewarmer lang={lang} />
      <NativeOAuthInitializer />
      <NativePGSInitializer />
      <OfflineBanner />
      <OfflineSyncBridge />
      <InGameAudioButton />
      <DeferredLayoutWidgets />
      <FeedbackDevtoolsWidget />
      <GoogleOneTapInitializer />
      <CrazyGamesScriptServer />
    </>
  );
}
