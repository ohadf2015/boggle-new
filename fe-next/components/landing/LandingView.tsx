'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useLanguage } from '@/contexts/LanguageContext';
import Header from '@/components/Header';
import type { LandingInitialData } from '@/lib/landing/fetchLandingData';
import { HomeTreeBoot, HomeTreeSlot, useHomeTree } from './homeTree';
import { FreshPage } from './fresh/FreshPage';
import { setFreshPlay } from './fresh/freshPlayBridge';
import { ReturningHome } from './ReturningHome';

// SSR enabled (code-split only): the authored SEO copy and the /blog interlinks are
// the landing page's organic-search surface and MUST be in the server HTML — LandingSEOSection's
// motion variants are visible-by-default for exactly this reason. Do NOT add `ssr: false` here; that ships an
// animate-pulse skeleton to crawlers instead of the <h2>s and links.
// Guarded by LandingView.ssr.test.tsx.
const LandingSEOSection = dynamic(() => import('./LandingSEOSection').then(m => m.LandingSEOSection), {
  loading: () => <div className="h-64 w-full" />,
});
const LandingBlogSection = dynamic(() => import('./LandingBlogSection').then(m => m.LandingBlogSection), {
  loading: () => <div className="h-48 w-full" />,
});

interface LandingViewProps {
  /** Pre-fetched server data — eliminates client-side waterfall fetches */
  initialData?: LandingInitialData;
  /**
   * New users: opens OnboardingFlow. Wired to the fresh page's PLAY links, which
   * are real <a href> in the server HTML; this only upgrades their click.
   */
  onStartOnboarding?: () => void;
}

/**
 * Homepage shell. Fresh visitors (and crawlers) get the one-page FreshPage;
 * returning users keep ReturningHome. The choice is made before paint (see
 * ./homeTree): the server renders both, CSS shows one, the client mounts one.
 * SEO copy + blog interlinks render ONCE below both trees, for everyone.
 */
const LandingView: React.FC<LandingViewProps> = ({ initialData, onStartOnboarding }) => {
  const { language } = useLanguage();
  const router = useRouter();
  const tree = useHomeTree();

  // The finale PLAY ends the page from HomepageContentSection (page.tsx), which
  // is outside this subtree, so it takes the same quick-play action through
  // the bridge. Cleared on unmount and whenever the action goes away.
  useEffect(() => {
    setFreshPlay(onStartOnboarding);
    return () => setFreshPlay(undefined);
  }, [onStartOnboarding]);

  // Check for room parameter and redirect to multiplayer page
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const urlParams = new URLSearchParams(window.location.search);
    const roomCode = urlParams.get('room');
    if (roomCode) {
      router.replace(`/${language}/multiplayer${window.location.search}`);
    }
  }, [language, router]);

  return (
    // No `page-content-safe` here: its 80px mobile-tab-bar reserve landed in
    // the MIDDLE of the tail (between the blog and the FAQ). It now ends the
    // page inside HomepageContentSection, for returning visitors only (fresh
    // visitors get no tab bar on the homepage, see ./homeTree).
    <div className="flex flex-col bg-neo-navy relative">
      <HomeTreeBoot />
      <Header />

      <HomeTreeSlot tree={tree} which="fresh">
        <FreshPage onPlay={onStartOnboarding} />
      </HomeTreeSlot>

      <HomeTreeSlot tree={tree} which="returning">
        <ReturningHome initialData={initialData} onStartOnboarding={onStartOnboarding} />
      </HomeTreeSlot>

      {/* How to Play (homepage gauntlet, round 6): a section at the width and
          rhythm of sections 2-6, not a narrow fine-print column. Its steps are
          the hero's tiles on a lime trace path (LandingSEOSection), then the
          blog as one visible list. page.tsx follows with the FAQ card
          (HomepageContentSection), whose last child is the finale PLAY band,
          right above the site footer (fresh.shell.ending.test). SSR'd and
          visible at rest; no disclosure here, the FAQ is the page's one. */}
      <div
        data-home-tail="tail"
        className="relative z-20 mx-auto flex w-full max-w-6xl flex-col gap-16 px-4 pb-8 pt-24 sm:px-6 md:gap-20 md:pb-12 md:pt-40 lg:px-8"
      >
        <LandingSEOSection />
        <LandingBlogSection />
      </div>
    </div>
  );
};

export default LandingView;
