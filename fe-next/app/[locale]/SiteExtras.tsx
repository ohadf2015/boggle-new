'use client';

/**
 * Site-only chrome. Dynamically imported with ssr:false from LocaleBodyChrome
 * so /singleplayer never downloads footer/nav/OAuth/pixels/widgets.
 */

import nextDynamic from 'next/dynamic';
import AutoHideFooter from '@/components/AutoHideFooter';
import GlobalBottomNav from '@/components/GlobalBottomNav';
import DictionaryPrewarmer from '@/components/DictionaryPrewarmer';
import NativeOAuthInitializer from '@/components/NativeOAuthInitializer';
import NativePGSInitializer from '@/components/NativePGSInitializer';
import FeedbackDevtoolsWidget from '@/components/feedback/FeedbackDevtoolsWidget';
import WebVitalsReporter from '@/components/WebVitalsReporter';
import PagePresenceReporter from '@/components/PagePresenceReporter';
import AnimationsLoader from '@/components/AnimationsLoader';
import GoogleOneTapInitializer from '@/components/auth/GoogleOneTapInitializer';
import { OfflineBanner } from '@/components/offline/OfflineBanner';
import { OfflineSyncBridge } from '@/components/offline/OfflineSyncBridge';
import type { Language } from '@/shared/types/game';

const DeferredLayoutWidgets = nextDynamic(() => import('@/components/DeferredLayoutWidgets'), {
  ssr: false,
  loading: () => null,
});
const SocialMediaPixels = nextDynamic(() => import('@/components/SocialMediaPixels'), {
  ssr: false,
  loading: () => null,
});

interface SiteExtrasProps {
  lang: Language;
}

export default function SiteExtras({ lang }: SiteExtrasProps) {
  return (
    <>
      <SocialMediaPixels />
      <WebVitalsReporter />
      <PagePresenceReporter />
      <AnimationsLoader />
      <DictionaryPrewarmer lang={lang} />
      <NativeOAuthInitializer />
      <NativePGSInitializer />
      <OfflineBanner />
      <OfflineSyncBridge />
      <AutoHideFooter className="relative z-0 shrink-0" />
      <GlobalBottomNav />
      <DeferredLayoutWidgets />
      <FeedbackDevtoolsWidget />
      <GoogleOneTapInitializer />
    </>
  );
}
