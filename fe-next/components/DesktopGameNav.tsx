'use client';

import { memo, useMemo } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Home, Swords, Zap, Calendar, Trophy, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { useNavigation } from '@/contexts/NavigationContext';
import { useAuth } from '@/contexts/AuthContext';
import { useCrazyGames } from '@/components/CrazyGamesSDK';
import { useIsPracticeVeteran } from '@/hooks/useIsPracticeVeteran';

interface NavItem {
  id: string;
  labelKey: string;
  icon: typeof Home;
  /** Path used for active-state matching against the current pathname. */
  route: string;
  /**
   * Optional navigation target, used when the canonical destination differs from
   * `route`. The Quick Play tab must not soft-nav into `/singleplayer` (308
   * redirect stub → client RSC fail). Beta/admin → solo wheel hub `/quick-play`;
   * everyone else → MP quick-play flow.
   */
  href?: string;
  color: string;
  activeColor: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'home', labelKey: 'nav.home', icon: Home, route: '', color: 'text-neo-white', activeColor: 'text-neo-lime border-neo-lime' },
  // href is resolved at render time for the singleplayer tab (beta vs public).
  { id: 'singleplayer', labelKey: 'nav.singleplayer', icon: Zap, route: '/singleplayer', href: '/multiplayer?quickPlay=true', color: 'text-neo-white', activeColor: 'text-neo-cyan border-neo-cyan' },
  { id: 'multiplayer', labelKey: 'nav.play', icon: Swords, route: '/multiplayer', color: 'text-neo-white', activeColor: 'text-neo-pink border-neo-pink' },
  { id: 'daily', labelKey: 'nav.daily', icon: Calendar, route: '/daily', color: 'text-neo-white', activeColor: 'text-neo-yellow border-neo-yellow' },
  { id: 'leaderboard', labelKey: 'nav.leaderboard', icon: Trophy, route: '/leaderboard', color: 'text-neo-white', activeColor: 'text-neo-yellow border-neo-yellow' },
  { id: 'friends', labelKey: 'nav.friends', icon: Users, route: '/friends', color: 'text-neo-white', activeColor: 'text-neo-pink border-neo-pink' },
];

/** Public MP quick-play. Beta/admin solo arcade wheel lives at /quick-play. */
export const QUICK_PLAY_PUBLIC_HREF = '/multiplayer?quickPlay=true';
export const QUICK_PLAY_SOLO_HREF = '/quick-play';

/**
 * DesktopGameNav — Horizontal game mode tabs shown on md+ screens.
 * Sits below the header, above main content. Hidden on mobile (where GlobalBottomNav is used).
 */
export const DesktopGameNav = memo(function DesktopGameNav() {
  const { t, language } = useLanguage();
  const { isInGame } = useNavigation();
  const { canSeeInWorkModes } = useAuth();
  const { isOnCrazyGamesPlatform } = useCrazyGames();
  const isVeteran = useIsPracticeVeteran();
  const router = useRouter();
  const pathname = usePathname();

  // Beta/admin get the solo wheel hub we polished; public keeps the MP flow.
  const quickPlayHref = canSeeInWorkModes ? QUICK_PLAY_SOLO_HREF : QUICK_PLAY_PUBLIC_HREF;

  const activeId = useMemo(() => {
    const cleanPath = pathname.replace(`/${language}`, '') || '/';
    if (cleanPath === '' || cleanPath === '/') return 'home';
    // Solo wheel hub is the beta Quick Play surface.
    if (cleanPath.startsWith('/quick-play')) return 'singleplayer';
    for (const item of NAV_ITEMS) {
      if (item.route && cleanPath.startsWith(item.route)) return item.id;
    }
    return 'home';
  }, [pathname, language]);

  // Hide desktop nav on CrazyGames — external links and social features prohibited
  if (isInGame || isOnCrazyGamesPlatform) return null;

  // Practice gate: pre-graduation players (<20 words) shouldn't be tempted by other
  // modes from the home/practice routes. Other routes (leaderboard/friends/etc.)
  // stay reachable so navigation isn't a dead end.
  if (!isVeteran) {
    const cleanPath = pathname.replace(`/${language}`, '') || '/';
    const onPracticeSurface = cleanPath === '/' || cleanPath.startsWith('/singleplayer');
    if (onPracticeSurface) return null;
  }

  return (
    <nav
      data-desktop-game-nav
      className="hidden md:block relative w-full bg-neo-navy/80 border-b-2 border-neo-white/10 shrink-0 z-55"
      aria-label={t('nav.gameNavigation') || 'Game navigation'}
    >
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
          {NAV_ITEMS.map((item) => {
            const isActive = activeId === item.id;
            const Icon = item.icon;
            const href =
              item.id === 'singleplayer' ? quickPlayHref : (item.href ?? item.route);
            return (
              <button
                key={item.id}
                onClick={() => router.push(`/${language}${href}`)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-2.5 text-sm font-bold whitespace-nowrap transition-all duration-150 border-b-3 -mb-[2px]',
                  isActive
                    ? item.activeColor
                    : cn(item.color, 'border-transparent hover:text-neo-white hover:border-neo-white/20'),
                )}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon className="w-4 h-4" />
                <span>{t(item.labelKey) || item.id}</span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
});

export default DesktopGameNav;
