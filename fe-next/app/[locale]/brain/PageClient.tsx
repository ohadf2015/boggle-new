'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { m } from 'framer-motion';
import { ArrowLeft, FlaskConical } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/utils/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useBrainScore } from '@/hooks/useBrainScore';
import { cn } from '@/lib/utils';
import QuickDrillsSection from '@/components/brain/QuickDrillsSection';
import BrainCheckPanel from '@/components/brain/BrainCheckPanel';
// Sign-in modal opens only on a CTA click — lazy-load to keep its ~40KB out of
// this route's initial parse. ssr:false: renders nothing when closed.
const AuthModal = dynamic(() => import('@/components/auth/AuthModal'), { ssr: false });
import PageLoader from '@/components/ui/PageLoader';

/**
 * Header component for Brain Training page
 */
interface HeaderProps {
  isDarkMode: boolean;
  onBack: () => void;
  title: string;
  backText: string;
}

function Header({ isDarkMode, onBack, title, backText }: HeaderProps) {
  return (
    <header className={cn(
      'sticky top-0 z-40',
      'border-b-4 border-neo-black',
      isDarkMode ? 'bg-neo-navy' : 'bg-neo-cream'
    )}>
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top, 0.75rem))' }}
      >
        <button
          type="button"
          onClick={onBack}
          className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-neo',
            'border-3 border-neo-black shadow-hard-sm',
            'transition-all hover:translate-y-[-2px] hover:shadow-hard',
            isDarkMode ? 'bg-neo-navy text-neo-white' : 'bg-neo-cream text-neo-black'
          )}
        >
          <ArrowLeft className="w-5 h-5 rtl:rotate-180" />
          <span className="font-bold text-sm hidden sm:inline">{backText}</span>
        </button>

        <h1 className={cn(
          'text-xl font-black uppercase tracking-wide',
          isDarkMode ? 'text-neo-white' : 'text-neo-black'
        )}>
          {title}
        </h1>

        <div className="w-10" /> {/* Spacer for centering */}
      </div>
    </header>
  );
}

/**
 * Brain Drills hub (v2).
 *
 * Two jobs, kept apart on purpose:
 *  - TRAIN: adaptive drills (QuickDrillsSection) — difficulty follows you.
 *  - MEASURE: Brain Check (BrainCheckPanel) — fixed protocol, spaced, with a
 *    reliable-change verdict. The old 0-100 "Brain Score"/tier/radar was an EMA
 *    seeded at 50 and is no longer presented as a measurement.
 */
export default function BrainTrainingPageClient() {
  const router = useRouter();
  const { t, language } = useLanguage();
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { drillProgress, isLoading, refresh } = useBrainScore();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'signin' | 'signup'>('signup');

  // A finished drill sets `lex_brain_dirty=1`; refresh once so levels are current.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      if (sessionStorage.getItem('lex_brain_dirty') === '1') {
        sessionStorage.removeItem('lex_brain_dirty');
        void refresh();
      }
    } catch { /* storage blocked */ }
  }, [refresh]);

  if (authLoading || (isAuthenticated && isLoading)) {
    return <PageLoader size="lg" text={t('brain.loading')} mascotVariant="thinking" />;
  }

  const openAuth = (mode: 'signin' | 'signup') => { setAuthModalMode(mode); setShowAuthModal(true); };

  return (
    <div className={cn('flex-1 flex flex-col min-h-0 page-content-safe', isDarkMode ? 'bg-neo-navy' : 'bg-neo-cream')}>
      <Header
        isDarkMode={isDarkMode}
        onBack={() => router.push(`/${language}`)}
        title={t('brain.title')}
        backText={t('common.back')}
      />

      <div className="px-4 py-6 pb-24 space-y-6 max-w-4xl mx-auto w-full flex-1">
        <QuickDrillsSection drillProgress={isAuthenticated ? drillProgress : undefined} />

        {isAuthenticated ? (
          <BrainCheckPanel />
        ) : (
          <m.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              'p-6 rounded-neo border-4 border-neo-black shadow-hard-lg text-center',
              isDarkMode ? 'bg-neo-navy-light text-neo-white' : 'bg-white text-neo-black'
            )}
          >
            <FlaskConical className="w-12 h-12 mx-auto mb-3 text-neo-yellow" aria-hidden="true" />
            <h2 className="text-xl font-black uppercase mb-2">{t('brain.check.title')}</h2>
            <p className="text-sm mb-5 opacity-90">{t('brain.check.guestPitch')}</p>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => openAuth('signup')}
                className="px-6 py-3 rounded-neo font-bold border-3 border-neo-black shadow-hard transition-all hover:translate-y-[-2px] hover:shadow-hard-lg bg-neo-lime text-neo-black"
              >
                {t('auth.signUp')}
              </button>
              <button
                type="button"
                onClick={() => openAuth('signin')}
                className="px-6 py-3 rounded-neo font-bold border-3 border-neo-black shadow-hard transition-all hover:translate-y-[-2px] hover:shadow-hard-lg bg-neo-cyan text-neo-black"
              >
                {t('auth.signIn')}
              </button>
            </div>
          </m.div>
        )}
      </div>

      {showAuthModal && (
        <AuthModal isOpen onClose={() => setShowAuthModal(false)} showGuestStats initialMode={authModalMode} />
      )}
    </div>
  );
}
