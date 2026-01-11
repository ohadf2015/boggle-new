'use client';

import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { InteractiveMascot } from '@/components/ui/InteractiveMascot';

export default function NotFound() {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-neo-navy via-neo-navy-light to-neo-navy px-4 relative overflow-hidden">
      {/* Animated background decoration - floating letters */}
      <div className="absolute inset-0 pointer-events-none opacity-10">
        <div className="absolute top-[10%] left-[10%] text-6xl font-black text-neo-yellow animate-float font-neo-display">?</div>
        <div className="absolute top-[20%] right-[15%] text-5xl font-black text-neo-pink animate-bob font-neo-display" style={{ animationDelay: '0.5s' }}>4</div>
        <div className="absolute bottom-[25%] left-[15%] text-4xl font-black text-neo-cyan animate-float font-neo-display" style={{ animationDelay: '1s' }}>0</div>
        <div className="absolute bottom-[15%] right-[20%] text-5xl font-black text-neo-yellow animate-bob font-neo-display" style={{ animationDelay: '1.5s' }}>4</div>
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

        {/* 404 Number with enhanced gradient and animation */}
        <div className="text-9xl font-black text-transparent bg-clip-text bg-gradient-to-r from-neo-cyan via-neo-pink to-neo-yellow mb-6 font-neo-display animate-gradient-x" style={{ backgroundSize: '200% auto' }}>
          404
        </div>

        {/* Heading with neo-brutalist card style */}
        <div className="bg-neo-yellow border-4 border-neo-black rounded-neo shadow-hard-lg p-6 mb-6 transform hover:shadow-hard-xl hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all">
          <h1 className="text-3xl font-black text-neo-black mb-3 uppercase font-neo-display leading-tight">
            {t('notFound.heading')}
          </h1>
          <p className="text-neo-black/80 font-bold font-neo-body text-lg">
            {t('notFound.message')}
          </p>
        </div>

        {/* Action Button */}
        <Link
          href="/"
          className="inline-flex items-center justify-center px-8 py-4 bg-neo-cyan text-neo-black font-black uppercase border-4 border-neo-black rounded-neo shadow-hard-lg hover:shadow-hard-xl hover:translate-x-[-2px] hover:translate-y-[-2px] active:shadow-hard-pressed active:translate-x-[2px] active:translate-y-[2px] transition-all duration-150 text-lg font-neo-display"
        >
          {t('notFound.button')}
        </Link>
      </div>
    </div>
  );
}
