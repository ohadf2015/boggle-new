'use client';

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

  // TV fullscreen or desktop gameplay: no footer at all
  if (isTvFullscreen || (isInGame && isDesktop)) {
    return null;
  }

  const cleanPath = pathname.replace(`/${language}`, '');
  const isGameRoute = ['/singleplayer', '/multiplayer', '/daily', '/adventure', '/education', '/student', '/teacher'].some(
    path => cleanPath.startsWith(path)
  );

  // Game routes or active gameplay on mobile: compact legal-only footer (AdSense requirement)
  if (isInGame || isGameRoute) {
    return (
      <footer
        role="contentinfo"
        className="py-1.5 px-3 border-t border-neo-black/30 bg-neo-navy/80 text-center"
      >
        <nav aria-label="Legal" className="flex items-center justify-center gap-2 text-[10px] text-neo-cream/50">
          <Link href={`/${language}/contact`} className="hover:text-neo-cream/80 transition-colors">
            {t('footer.contact')}
          </Link>
          <span>·</span>
          <Link href={`/${language}/legal/privacy`} className="hover:text-neo-cream/80 transition-colors">
            {t('legal.privacyPolicy')}
          </Link>
          <span>·</span>
          <Link href={`/${language}/legal/terms`} className="hover:text-neo-cream/80 transition-colors">
            {t('legal.termsOfService')}
          </Link>
          <span>·</span>
          <Link href={`/${language}/about`} className="hover:text-neo-cream/80 transition-colors">
            {t('footer.about')}
          </Link>
        </nav>
      </footer>
    );
  }

  return <Footer className={className} />;
}

export default AutoHideFooter;
