'use client';
import { useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { QuickLanguageSwitcher } from '@/components/QuickLanguageSwitcher';
import { trackGrowthEvent } from '@/utils/growthTracking';

const AuthModal = dynamic(() => import('@/components/auth/AuthModal'), { ssr: false });

export function LandingHeader({ showStart = true }: { showStart?: boolean }) {
  const { t, language } = useLanguage();
  const { isAuthenticated } = useAuth();
  const [signInOpen, setSignInOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b-2 border-neo-cream bg-neo-navy">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-2 px-4 sm:h-16 sm:gap-3 sm:px-6 lg:px-8">
        <Link
          href={`/${language}`}
          data-testid="landing-header-home"
          aria-label={t('eg2Land.header.home')}
          className="flex min-w-0 shrink items-center gap-1.5 rounded-sm focus:outline-hidden focus-visible:ring-2 focus-visible:ring-neo-cyan"
        >
          <span className="truncate font-neo-display text-lg font-black uppercase tracking-tight text-neo-cream sm:text-xl">
            LexiClash
          </span>
          <span className="hidden shrink-0 -rotate-2 rounded-neo-sm border-2 border-neo-black bg-neo-lime px-1.5 py-0.5 font-neo-display text-[11px] font-black uppercase leading-none text-neo-navy shadow-hard-sm min-[400px]:inline-block">
            {t('eg2Land.header.tag')}
          </span>
        </Link>

        <div className="ms-auto flex shrink-0 items-center gap-2 sm:gap-3">
          <QuickLanguageSwitcher compact />
          {!isAuthenticated && (
            <button
              type="button"
              data-testid="education-sign-in"
              onClick={() => {
                trackGrowthEvent('landing_cta_clicked', { cta: 'education_sign_in' });
                setSignInOpen(true);
              }}
              className="min-h-11 px-1 font-neo-display text-sm font-bold text-neo-cream underline-offset-4 hover:underline focus:outline-hidden focus-visible:ring-2 focus-visible:ring-neo-cyan"
            >
              {t('auth.signIn')}
            </button>
          )}
          {showStart && (
            <Link
              href={`/${language}/education/access`}
              data-testid="landing-header-start"
              onClick={() => trackGrowthEvent('landing_cta_clicked', { cta: 'education_header_start' })}
              className="inline-flex min-h-10 items-center whitespace-nowrap rounded-neo border-2 border-neo-black bg-neo-lime px-3 font-neo-display text-sm font-black uppercase text-neo-navy shadow-hard-sm transition-transform duration-100 hover:-translate-y-0.5 active:translate-y-0.5 motion-reduce:transition-none sm:px-4"
            >
              {t('eg2Land.header.start')}
            </Link>
          )}
        </div>
      </div>
      {signInOpen && (
        <AuthModal isOpen onClose={() => setSignInOpen(false)} initialMode="signin" audience="teacher" />
      )}
    </header>
  );
}

export default LandingHeader;
