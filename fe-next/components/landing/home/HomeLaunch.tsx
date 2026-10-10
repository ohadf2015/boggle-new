'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
  type ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import styles from './HomeLaunch.module.css';

export type LaunchTone = 'yellow' | 'lime' | 'pink' | 'cyan' | 'purple' | 'orange' | 'blue';

/** Long enough for the burst and the GO tiles to land, short enough to feel like a press. */
export const LAUNCH_HOLD_MS = 420;

const TONE: Record<LaunchTone, { bg: string; ink: string; tile: string }> = {
  yellow: { bg: 'bg-neo-yellow', ink: 'text-neo-navy', tile: 'bg-neo-navy text-neo-yellow' },
  lime: { bg: 'bg-neo-lime', ink: 'text-neo-navy', tile: 'bg-neo-navy text-neo-lime' },
  pink: { bg: 'bg-neo-pink', ink: 'text-neo-navy', tile: 'bg-neo-navy text-neo-pink' },
  cyan: { bg: 'bg-neo-cyan', ink: 'text-neo-navy', tile: 'bg-neo-navy text-neo-cyan' },
  purple: { bg: 'bg-neo-purple', ink: 'text-neo-white', tile: 'bg-neo-cream text-neo-purple' },
  orange: { bg: 'bg-neo-orange', ink: 'text-neo-navy', tile: 'bg-neo-navy text-neo-orange' },
  blue: { bg: 'bg-blue-500', ink: 'text-neo-white', tile: 'bg-neo-cream text-blue-600' },
};

const TILT = [-4, 3, -2, 4, -3, 2, -4, 3];

export interface LaunchTarget {
  href: string;
  tone: LaunchTone;
  title?: string;
  /** mode art shown popping in the middle of the burst */
  art?: string;
}

interface LaunchCurtainProps {
  tone: LaunchTone;
  title?: string;
  art?: string;
  /** viewport point the burst grows from (the tap); centre when absent */
  origin?: { x: number; y: number } | null;
  testId?: string;
}

/** Full-screen launch art. Also the fresh tree's quick-play cover, so both doors open the same way. */
export function LaunchCurtain({ tone, title, art, origin, testId = 'home-launch' }: LaunchCurtainProps) {
  const { t, dir } = useLanguage();
  const word = Array.from(t('landing.launch.go'));
  const c = TONE[tone];
  const vars = {
    '--lx': origin ? `${origin.x}px` : '50%',
    '--ly': origin ? `${origin.y}px` : '50%',
  } as CSSProperties;

  return (
    <div
      data-testid={testId}
      role="status"
      aria-live="polite"
      dir={dir}
      className="fixed inset-0 z-[100] overflow-hidden"
      style={vars}
    >
      <div className={cn('absolute inset-0 flex items-center justify-center', c.bg, c.ink, styles.stage)}>
        <span
          aria-hidden="true"
          className={cn('pointer-events-none absolute left-1/2 top-1/2 -ml-[125vmax] -mt-[125vmax] h-[250vmax] w-[250vmax] rounded-full', styles.sunburst)}
        />
        <div className="relative flex flex-col items-center gap-5 px-4 text-center">
          {art && (
            // eslint-disable-next-line @next/next/no-img-element -- already decoded by the card that launched it
            <img
              src={art}
              alt=""
              aria-hidden="true"
              className={cn(
                'h-36 w-36 rounded-neo-xl border-neo-thick border-black bg-neo-navy object-cover shadow-hard-lg sm:h-44 sm:w-44',
                styles.art,
              )}
            />
          )}
          <div aria-hidden="true" className="flex gap-1 sm:gap-2">
            {word.map((ch, i) => (
              <span
                key={`${ch}-${i}`}
                data-launch-tile
                style={{ '--i': i, '--tilt': `${TILT[i % TILT.length]}deg` } as CSSProperties}
                className={cn(
                  'flex h-11 w-11 items-center justify-center rounded-neo border-[3px] border-black font-neo-display text-2xl font-black uppercase shadow-hard sm:h-16 sm:w-16 sm:text-4xl',
                  c.tile,
                  styles.tile,
                )}
              >
                {ch}
              </span>
            ))}
          </div>
          {title && (
            <p className="font-neo-display text-xl font-black uppercase tracking-wide sm:text-2xl">{title}</p>
          )}
          <span aria-hidden="true" className="h-3 w-48 overflow-hidden rounded-full border-2 border-black bg-neo-navy/20 sm:w-64">
            <span className={cn('block h-full w-full rounded-full bg-neo-navy', styles.bar)} />
          </span>
          <span className="sr-only">{t('onboarding.loading')}</span>
        </div>
      </div>
    </div>
  );
}

interface LaunchApi {
  /** Upgrades a link click into the launch. Returns false when the browser should handle it. */
  start: (e: MouseEvent<HTMLElement>, target: LaunchTarget) => boolean;
  prefetch: (href: string) => void;
}

const LaunchContext = createContext<LaunchApi | null>(null);

/** null outside a LaunchProvider: callers keep their plain link navigation. */
export function useHomeLaunch(): LaunchApi | null {
  return useContext(LaunchContext);
}

function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

interface ActiveLaunch extends LaunchTarget {
  origin: { x: number; y: number } | null;
}

export function LaunchProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [active, setActive] = useState<ActiveLaunch | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  // Back-forward cache restores the page with the curtain still up; a dead navigation must not strand it.
  useEffect(() => {
    if (!active) return;
    const clear = (e: PageTransitionEvent) => e.persisted && setActive(null);
    window.addEventListener('pageshow', clear);
    const safety = setTimeout(() => setActive(null), 15000);
    return () => {
      clearTimeout(safety);
      window.removeEventListener('pageshow', clear);
    };
  }, [active]);

  const start = useCallback(
    (e: MouseEvent<HTMLElement>, target: LaunchTarget) => {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return false;
      e.preventDefault();
      if (timer.current) return true;
      const rect = e.currentTarget.getBoundingClientRect();
      const origin =
        e.clientX || e.clientY
          ? { x: e.clientX, y: e.clientY }
          : { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      setActive({ ...target, origin });
      timer.current = setTimeout(() => {
        timer.current = null;
        router.push(target.href);
      }, prefersReducedMotion() ? 0 : LAUNCH_HOLD_MS);
      return true;
    },
    [router],
  );

  const prefetch = useCallback((href: string) => router.prefetch(href), [router]);
  const api = useMemo(() => ({ start, prefetch }), [start, prefetch]);

  return (
    <LaunchContext.Provider value={api}>
      {children}
      {active && <LaunchCurtain tone={active.tone} title={active.title} art={active.art} origin={active.origin} />}
    </LaunchContext.Provider>
  );
}
