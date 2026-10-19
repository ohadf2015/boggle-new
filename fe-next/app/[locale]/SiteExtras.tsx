'use client';

import { useEffect, useState } from 'react';
import nextDynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import SiteFooter from '@/components/navigation/SiteFooter';
import PlayerBottomNav from '@/components/navigation/PlayerBottomNav';
import DictionaryPrewarmer from '@/components/DictionaryPrewarmer';
import NativeOAuthInitializer from '@/components/NativeOAuthInitializer';
import NativePGSInitializer from '@/components/NativePGSInitializer';
import FeedbackDevtoolsWidget from '@/components/feedback/FeedbackDevtoolsWidget';
import WebVitalsReporter from '@/components/WebVitalsReporter';
import PagePresenceReporter from '@/components/PagePresenceReporter';
import AnimationsLoader from '@/components/AnimationsLoader';
import { OfflineBanner } from '@/components/offline/OfflineBanner';
import { OfflineSyncBridge } from '@/components/offline/OfflineSyncBridge';
import { isLandingPath } from '@/lib/i18n/isLandingPath';
import type { Language } from '@/shared/types/game';

const DeferredLayoutWidgets = nextDynamic(() => import('@/components/DeferredLayoutWidgets'), {
  ssr: false,
  loading: () => null,
});
const SocialMediaPixels = nextDynamic(() => import('@/components/SocialMediaPixels'), {
  ssr: false,
  loading: () => null,
});
// One Tap's module statically imported @supabase/gotrue. Keep the chunk off
// the landing PSI trace until a real pointer/key; other routes load it now.
const GoogleOneTapInitializer = nextDynamic(
  () => import(
    /* webpackPrefetch: false, webpackPreload: false */
    '@/components/auth/GoogleOneTapInitializer'
  ),
  { ssr: false, loading: () => null },
);

const ARM_EVENTS = ['pointerdown', 'keydown', 'touchstart'] as const;

function DeferredGoogleOneTap() {
  const pathname = usePathname();
  const landing = isLandingPath(pathname ?? '');
  const [armed, setArmed] = useState(!landing);

  useEffect(() => {
    if (!landing) {
      setArmed(true);
      return;
    }
    if (armed) return;
    const opts = { capture: true, passive: true } as const;
    const arm = () => setArmed(true);
    for (const type of ARM_EVENTS) window.addEventListener(type, arm, opts);
    return () => {
      for (const type of ARM_EVENTS) window.removeEventListener(type, arm, opts);
    };
  }, [landing, armed]);

  if (!armed) return null;
  return <GoogleOneTapInitializer />;
}

interface SiteExtrasProps {
  lang: Language;
}

export default function SiteExtras({ lang }: SiteExtrasProps) {
  return (
    <>
      <SocialMediaPixels />
      <WebVitalsReporter />
      <PagePresenceReporter language={lang} />
      <AnimationsLoader />
      <DictionaryPrewarmer lang={lang} />
      <NativeOAuthInitializer />
      <NativePGSInitializer />
      <OfflineBanner />
      <OfflineSyncBridge />
      <SiteFooter className="relative z-0 shrink-0" />
      <PlayerBottomNav />
      <DeferredLayoutWidgets />
      <FeedbackDevtoolsWidget />
      <DeferredGoogleOneTap />
    </>
  );
}
