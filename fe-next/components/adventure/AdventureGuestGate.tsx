'use client';

/**
 * AdventureGuestGate — inviting teaser screen for guests on the adventure map
 * and achievements pages. Shows hero art, pitch, benefits, and a sign-in CTA.
 * Tracks gate_viewed on mount and signin_clicked when the button is tapped.
 */
import { useState, useEffect, useRef, type ReactNode } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { ArrowLeft, Sparkles, Zap, Trophy } from 'lucide-react';
import Image from 'next/image';
import { useLanguageSafe } from '@/contexts/LanguageContext';
import { trackGrowthEvent } from '@/utils/growthTracking';
import { cn } from '@/lib/utils';

const AuthModal = dynamic(() => import('@/components/auth/AuthModal'), { ssr: false });

interface AdventureGuestGateProps {
  surface: 'map' | 'achievements';
}

interface BulletPoint {
  icon: React.FC<{ className?: string }>;
  textKey: string;
}

const BULLETS: BulletPoint[] = [
  {
    icon: Zap,
    textKey: 'adventurePlay.guest.bullet1',
  },
  {
    icon: Sparkles,
    textKey: 'adventurePlay.guest.bullet2',
  },
  {
    icon: Trophy,
    textKey: 'adventurePlay.guest.bullet3',
  },
];

export function AdventureGuestGate({ surface }: AdventureGuestGateProps): ReactNode {
  const { t, language } = useLanguageSafe();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const hasTrackedRef = useRef(false);

  // Track gate_viewed on mount, once only (guard against StrictMode double-render).
  useEffect(() => {
    if (!hasTrackedRef.current) {
      hasTrackedRef.current = true;
      trackGrowthEvent('adventure_guest_gate_viewed', { surface });
    }
  }, [surface]);

  const handleSignIn = () => {
    trackGrowthEvent('adventure_guest_signin_clicked', { surface });
    setShowAuthModal(true);
  };

  return (
    <div className="min-h-dvh flex flex-col bg-[#0f1b3d] text-neo-cream">
      {/* Header: back home link */}
      <header className="sticky top-0 z-40 px-3 pt-[max(0.625rem,env(safe-area-inset-top))] pb-2.5">
        <Link
          href={`/${language}`}
          aria-label={t('adventurePlay.backHome')}
          className="inline-flex items-center gap-1.5 rounded-xl border-[3px] border-black bg-neo-cream text-black p-2 shadow-[3px_3px_0_#000]"
        >
          <ArrowLeft className="w-5 h-5 rtl:rotate-180" />
        </Link>
      </header>

      {/* Main content */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-8 sm:py-12">
        <div className="w-full max-w-md">
          {/* Hero image */}
          <div className="mb-6 rounded-xl overflow-hidden border-[3px] border-black shadow-[6px_6px_0_#000]">
            <Image
              src="/images/adventure/world-meadows-3d.webp"
              alt={t('adventurePlay.guest.pitch')}
              width={480}
              height={320}
              className="w-full h-auto object-cover"
              priority
            />
          </div>

          {/* Pitch */}
          <h1 className="font-neo-display text-2xl font-bold text-center mb-4 text-neo-lime">
            {t('adventurePlay.guest.pitch')}
          </h1>

          {/* Bullets */}
          <ul className="space-y-3 mb-6">
            {BULLETS.map((bullet) => {
              const Icon = bullet.icon;
              return (
                <li
                  key={bullet.textKey}
                  className="flex items-start gap-3 bg-neo-navy-light border-2 border-neo-cyan rounded-lg p-3"
                >
                  <Icon className="w-5 h-5 mt-0.5 flex-shrink-0 text-neo-cyan" aria-hidden />
                  <span className="text-sm font-medium">{t(bullet.textKey)}</span>
                </li>
              );
            })}
          </ul>

          {/* Sign-in button */}
          <button
            type="button"
            onClick={handleSignIn}
            className={cn(
              'w-full rounded-xl border-[3px] border-black font-bold px-5 py-3 shadow-[3px_3px_0_#000]',
              'bg-neo-lime text-black hover:bg-[#dcff00] transition-colors',
              'uppercase tracking-wide text-sm'
            )}
          >
            {t('adventurePlay.guest.signIn')}
          </button>

          {/* Home link (secondary) */}
          <div className="mt-4 text-center">
            <Link
              href={`/${language}`}
              className="text-xs text-neo-cream/70 hover:text-neo-cream underline"
            >
              {t('adventurePlay.backHome')}
            </Link>
          </div>
        </div>
      </main>

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        initialMode="signin"
      />
    </div>
  );
}
