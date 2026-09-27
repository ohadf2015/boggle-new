'use client';

/**
 * Demo result screen shown after the guest plays the free battle.
 * Shows score/outcome, sign-in CTA, play again, and home links.
 */
import { useState, type ReactNode } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useLanguageSafe } from '@/contexts/LanguageContext';
import { trackGrowthEvent } from '@/utils/growthTracking';
import { cn } from '@/lib/utils';
import type { RunResult } from '../play/runTypes';

const AuthModal = dynamic(() => import('@/components/auth/AuthModal'), { ssr: false });

interface DemoResultCardProps {
  result: RunResult;
  onPlayAgain: () => void;
}

export function DemoResultCard({ result, onPlayAgain }: DemoResultCardProps): ReactNode {
  const { t, language } = useLanguageSafe();
  const [showAuthModal, setShowAuthModal] = useState(false);

  const handleSignIn = () => {
    trackGrowthEvent('adventure_guest_signin_clicked', { surface: 'demo' });
    setShowAuthModal(true);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-[#0f1b3d] text-neo-cream rounded-xl border-[3px] border-black shadow-[6px_6px_0_#000] max-w-sm w-full p-6">
        {/* Result */}
        <h2 className="font-neo-display text-2xl font-bold text-center mb-4">
          {result.won ? (
            <span className="text-neo-lime">{t('adventurePlay.guest.demoWon')}</span>
          ) : (
            <span className="text-neo-pink">{t('adventurePlay.guest.demoLost')}</span>
          )}
        </h2>

        {/* Score */}
        <p className="text-center text-lg font-semibold mb-6">
          {t('adventurePlay.guest.demoScore', { score: result.score })}
        </p>

        {/* Sign-in CTA */}
        <button
          type="button"
          onClick={handleSignIn}
          className={cn(
            'w-full rounded-xl border-[3px] border-black font-bold px-5 py-3 shadow-[3px_3px_0_#000]',
            'bg-neo-lime text-black hover:bg-[#dcff00] transition-colors',
            'uppercase tracking-wide text-sm mb-4'
          )}
        >
          {t('adventurePlay.guest.saveProgress')}
        </button>

        {/* Play again */}
        <button
          type="button"
          onClick={onPlayAgain}
          className={cn(
            'w-full rounded-xl border-[3px] border-black font-bold px-5 py-3 shadow-[3px_3px_0_#000]',
            'bg-neo-cyan text-black hover:bg-[#00ffff] transition-colors',
            'uppercase tracking-wide text-sm mb-4'
          )}
        >
          {t('adventurePlay.guest.playAgain')}
        </button>

        {/* Home link */}
        <div className="text-center">
          <Link
            href={`/${language}`}
            className="text-xs text-neo-cream/70 hover:text-neo-cream underline"
          >
            {t('adventurePlay.backHome')}
          </Link>
        </div>
      </div>

      {/* Auth Modal */}
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} initialMode="signin" />
    </div>
  );
}
