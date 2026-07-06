'use client';

/**
 * Quick Play page shell — beta/admin gate (mirrors /adventure), then the hub.
 * Gate renders nothing until the profile resolves: never flash the beta UI
 * at non-beta users (dual-source-of-truth pitfall).
 */
import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguageSafe } from '@/contexts/LanguageContext';
import { QuickPlayHub } from '@/components/quick-play/QuickPlayHub';

function LoadingFallback() {
  return <div className="min-h-screen bg-neo-navy" />;
}

function QuickPlayGate() {
  const { canSeeInWorkModes } = useAuth();
  const { language } = useLanguageSafe();
  const router = useRouter();
  const searchParams = useSearchParams();

  const isDev = process.env.NODE_ENV === 'development';
  useEffect(() => {
    if (!canSeeInWorkModes && !isDev) {
      router.replace(`/${language}`);
    }
  }, [canSeeInWorkModes, isDev, language, router]);

  if (!canSeeInWorkModes && !isDev) {
    return <LoadingFallback />;
  }

  return <QuickPlayHub challengeId={searchParams.get('challenge')} />;
}

export default function QuickPlayPageClient() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <div className="min-h-screen bg-neo-navy">
        <QuickPlayGate />
      </div>
    </Suspense>
  );
}
