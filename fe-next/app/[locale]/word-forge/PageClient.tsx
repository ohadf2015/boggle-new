'use client';

import React, { Suspense, useEffect } from 'react';
import nextDynamic from 'next/dynamic';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRouter } from 'next/navigation';
import { PageLoader } from '@/components/ui/PageLoader';

function LoadingFallback(): React.JSX.Element {
  return (
    <div className="flex-1 flex items-center justify-center bg-[#0A0A1A] min-h-screen">
      <PageLoader size="lg" text="Forging..." />
    </div>
  );
}

const WordForgeGame = nextDynamic(
  () => import('@/components/wordForge/WordForgeGame'),
  {
    loading: LoadingFallback,
    ssr: false,
  }
);

/**
 * Word Forge Mode — Admin Only
 *
 * Uses useEffect for redirect to avoid hydration mismatch
 * (router.replace during render causes SSR/client divergence)
 */
export default function WordForgePageClient(): React.JSX.Element {
  const { isAdmin } = useAuth();
  const { language } = useLanguage();
  const router = useRouter();

  // Admin gate — allow in dev mode for testing
  const isDev = process.env.NODE_ENV === 'development';
  useEffect(() => {
    if (!isAdmin && !isDev) {
      router.replace(`/${language}`);
    }
  }, [isAdmin, isDev, language, router]);

  if (!isAdmin && !isDev) {
    return <LoadingFallback />;
  }

  return (
    <Suspense fallback={<LoadingFallback />}>
      <WordForgeGame />
    </Suspense>
  );
}
