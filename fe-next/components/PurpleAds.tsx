'use client';

import { useEffect, useState } from 'react';
import Script from 'next/script';

const PUBLISHER_ID = '69ea5d56c832eb2810de409c';
const SCRIPT_SRC = `https://app.purpleads.io/js/${PUBLISHER_ID}.js`;

type WinExt = Window & {
  Capacitor?: { isNativePlatform?: () => boolean };
  __crazyGamesEnvironment?: string;
};

/**
 * PurpleAds loader — web browser only.
 *
 * Skipped in: development, localhost, Capacitor native app, CrazyGames iframe
 * (env flag + icecream.me preview host).
 */
export function PurpleAds() {
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    if (process.env.NODE_ENV === 'development') return;

    const w = window as WinExt;
    const hostname = window.location.hostname;

    if (hostname === 'localhost' || hostname === '127.0.0.1') return;
    if (w.Capacitor?.isNativePlatform?.()) return;
    if (w.__crazyGamesEnvironment === 'crazygames') return;
    if (hostname.endsWith('icecream.me')) return;
    if (window.self !== window.top) return;

    setShouldRender(true);
  }, []);

  if (!shouldRender) return null;

  return (
    <Script
      id="purpleads-loader"
      src={SCRIPT_SRC}
      strategy="afterInteractive"
      async
      data-testid="purpleads-script"
    />
  );
}

export default PurpleAds;
