'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { InteractiveMascot } from '@/components/ui/InteractiveMascot';
import {
  recoverFromStaleChunk,
  clearCachesAndReload,
  CHUNK_RECOVERY_GUARD_KEY,
} from '@/lib/deploy/staleDeployReload';

export default function NotFound() {
  const { t, language } = useLanguage();

  useEffect(() => {
    document.title = '404 - ' + (t('notFound.heading') || 'Page Not Found') + ' | LexiClash';
  }, [t]);

  // A stale tab navigating after a deploy can hit a spurious 404 (the old build
  // requests an RSC/chunk that no longer exists). If the client build is provably
  // out of date, reload once to recover; a genuine 404 on a fresh build (build
  // times match) is left untouched, so this never loops on a real missing page.
  useEffect(() => {
    void recoverFromStaleChunk({
      clientBuildTime: process.env.NEXT_PUBLIC_BUILD_TIME,
      fetchServerBuildTime: async () => {
        const res = await fetch('/api/version?t=' + Date.now(), { cache: 'no-store' });
        if (!res.ok) throw new Error('version check failed');
        const data = (await res.json()) as { buildTime?: string };
        return data?.buildTime;
      },
      getGuard: () => {
        try {
          return sessionStorage.getItem(CHUNK_RECOVERY_GUARD_KEY) === 'true';
        } catch {
          return false;
        }
      },
      setGuard: () => {
        try {
          sessionStorage.setItem(CHUNK_RECOVERY_GUARD_KEY, 'true');
        } catch {
          /* sessionStorage unavailable — version mismatch is still the primary guard */
        }
      },
      clearCachesAndReload,
    });
  }, []);

  return (
    <div className="flex-1 flex items-center justify-center bg-linear-to-br from-neo-navy via-neo-navy-light to-neo-navy px-4 relative overflow-hidden">
      {/* Animated background decoration - floating letters */}
      <div className="absolute inset-0 pointer-events-none opacity-10">
        <div className="absolute top-[10%] left-[10%] text-6xl font-black text-neo-lime animate-float font-neo-display">?</div>
        <div className="absolute top-[20%] right-[15%] text-5xl font-black text-neo-pink animate-bob font-neo-display" style={{ animationDelay: '0.5s' }}>4</div>
        <div className="absolute bottom-[25%] left-[15%] text-4xl font-black text-neo-cyan animate-float font-neo-display" style={{ animationDelay: '1s' }}>0</div>
        <div className="absolute bottom-[15%] right-[20%] text-5xl font-black text-neo-lime animate-bob font-neo-display" style={{ animationDelay: '1.5s' }}>4</div>
      </div>

      <div className="text-center max-w-md relative z-10">
        {/* Interactive Mascot - confused, becomes thoughtful on hover, helpful on click */}
        <div className="mb-8 animate-neo-pop">
          <InteractiveMascot
            variant="confused"
            size="2xl"
            enableHover
            enableClick
            hoverVariant="thinking"
            clickVariant="waving"
            clickAnimation="wiggle"
            tooltip={t('notFound.mascotTooltip')}
            priority
          />
        </div>

        {/* 404 as a rejected word tile with score */}
        <div className="relative mb-6">
          <div className="text-9xl font-black text-transparent bg-clip-text bg-linear-to-r from-neo-cyan via-neo-pink to-neo-lime font-neo-display animate-gradient-x" style={{ backgroundSize: '200% auto' }}>
            404
          </div>
          <div className="text-neo-red font-black text-xl font-neo-display tracking-wider line-through decoration-neo-red decoration-4 inline-block">
            0 pts
          </div>
        </div>

        {/* Heading with neo-brutalist card style */}
        <div className="bg-neo-lime border-4 border-neo-black rounded-neo shadow-hard-lg p-6 mb-6 transform hover:shadow-hard-xl hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all">
          <h1 className="text-3xl font-black text-neo-black mb-3 uppercase font-neo-display leading-tight">
            {t('notFound.heading')}
          </h1>
          <p className="text-neo-black/80 font-bold font-neo-body text-lg">
            {t('notFound.message')}
          </p>
        </div>

        {/* Action Button */}
        <Link
          href={`/${language}`}
          className="inline-flex items-center justify-center px-8 py-4 bg-neo-cyan text-neo-black font-black uppercase border-4 border-neo-black rounded-neo shadow-hard-lg hover:shadow-hard-xl hover:translate-x-[-2px] hover:translate-y-[-2px] active:shadow-hard-pressed active:translate-x-[2px] active:translate-y-[2px] transition-all duration-150 text-lg font-neo-display"
        >
          {t('notFound.button')}
        </Link>
      </div>
    </div>
  );
}
