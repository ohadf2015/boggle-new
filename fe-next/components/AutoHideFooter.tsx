'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import Footer from './Footer';
import { useTvFullscreenListener } from '@/hooks/useTvFullscreenListener';
import { useNavigation } from '@/contexts/NavigationContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useIsDesktop } from '@/hooks/useDesktopLayout';

interface AutoHideFooterProps {
  className?: string;
}

/**
 * AutoHideFooter - Footer wrapper component
 *
 * Shows full footer on info pages, compact legal footer on game routes.
 * TV fullscreen hides footer entirely.
 */
export function AutoHideFooter({ className }: AutoHideFooterProps) {
  const isTvFullscreen = useTvFullscreenListener();
  const { isInGame } = useNavigation();
  const { t, language } = useLanguage();
  const pathname = usePathname();
  const isDesktop = useIsDesktop();

  // Client-only signals (isDesktop reads window in its useState initializer;
  // isInGame/isTvFullscreen are effect-driven) all start at their SSR values on
  // the server but flip on the desktop client's FIRST render — diverging from
  // the server HTML and triggering React #418 (whole-tree regeneration). Gate on
  // a mount flag so the first client render mirrors the server exactly; the
  // viewport-aware branch below runs only after mount.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const cleanPath = pathname.replace(`/${language}`, '');
  const isGameRoute = [
    '/singleplayer',
    '/multiplayer',
    '/daily',
    '/adventure',
    '/education',
    '/student',
    '/teacher',
    '/blast',
    '/word-of-the-day',
    '/challenge',
    '/party',
    '/brain',
    '/join',
    '/create',
    '/custom',
    '/quests',
    '/word-forge',
    '/connections',
  ].some(path => cleanPath.startsWith(path));

  // Until mounted, mirror the server render exactly (SSR defaults:
  // isDesktop=false, isInGame=false, isTvFullscreen=false) → game routes render
  // null, everything else the full Footer. Keeps hydration stable; the
  // viewport-aware branch takes over on the next commit.
  if (!mounted) {
    return isGameRoute ? null : <Footer className={className} />;
  }

  // TV fullscreen, desktop gameplay, or any mobile game/lobby screen: no footer
  if (isTvFullscreen || (isInGame && isDesktop) || (!isDesktop && (isInGame || isGameRoute))) {
    return null;
  }

  // Desktop game routes (lobby/landing): compact legal-only footer
  if (isInGame || isGameRoute) {
    return (
      <footer
        role="contentinfo"
        className="py-1.5 px-3 border-t border-neo-black/30 bg-neo-navy/80 text-center"
      >
        <nav aria-label="Legal" className="flex items-center justify-center gap-2 text-[10px] text-neo-white">
          <Link href={`/${language}/contact`} className="hover:text-neo-white transition-colors">
            {t('footer.contact')}
          </Link>
          <span>·</span>
          <Link href={`/${language}/legal/privacy`} className="hover:text-neo-white transition-colors">
            {t('legal.privacyPolicy')}
          </Link>
          <span>·</span>
          <Link href={`/${language}/legal/terms`} className="hover:text-neo-white transition-colors">
            {t('legal.termsOfService')}
          </Link>
          <span>·</span>
          <Link href={`/${language}/about`} className="hover:text-neo-white transition-colors">
            {t('footer.about')}
          </Link>
        </nav>
      </footer>
    );
  }

  return <Footer className={className} />;
}

export default AutoHideFooter;
