'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { LaunchCurtain } from './HomeLaunch';
import { ARRIVAL_CAP_MS, DEAD_NAV_MS, dropLaunch, useLaunchCover } from './launchStore';

const ROUTE_LOADER = '[data-testid="page-loader"]';
const POLL_MS = 60;
// The route loader often hands over to the page's own Suspense loader with a frame or two of nothing between.
const SETTLE_MS = 180;

/**
 * Lives in the always-mounted provider shell so a launch raised on the home stays
 * up across the route change and lifts when the next page is on screen: its shell
 * is mounted (game providers swap it out while their chunk loads) and no loader shows.
 */
export function LaunchHost() {
  const cover = useLaunchCover();
  const pathname = usePathname();

  useEffect(() => {
    if (!cover) return;
    const clear = (e: PageTransitionEvent) => e.persisted && dropLaunch();
    window.addEventListener('pageshow', clear);
    return () => window.removeEventListener('pageshow', clear);
  }, [cover]);

  useEffect(() => {
    if (!cover) return;
    if (window.location.pathname === cover.from) {
      if (cover.sticky) return;
      const dead = setTimeout(() => dropLaunch(cover.id), DEAD_NAV_MS);
      return () => clearTimeout(dead);
    }
    let waited = 0;
    let clearFor = 0;
    const arrived = () => {
      const onScreen = document.getElementById('main-content') && !document.querySelector(ROUTE_LOADER);
      clearFor = onScreen ? clearFor + POLL_MS : 0;
      waited += POLL_MS;
      if (clearFor >= SETTLE_MS || waited >= ARRIVAL_CAP_MS) dropLaunch(cover.id);
    };
    const poll = setInterval(arrived, POLL_MS);
    return () => clearInterval(poll);
  }, [cover, pathname]);

  if (!cover) return null;
  return <LaunchCurtain tone={cover.tone} title={cover.title} art={cover.art} origin={cover.origin} testId={cover.testId} />;
}
