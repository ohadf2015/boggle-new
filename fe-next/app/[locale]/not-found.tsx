'use client';

import Link from 'next/link';
import { InteractiveMascot } from '@/components/ui/InteractiveMascot';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-neo-navy via-neo-navy-light to-neo-navy px-4">
      <div className="text-center max-w-md">
        {/* Interactive Mascot - confused, becomes hopeful on interaction */}
        <div className="mb-4">
          <InteractiveMascot
            variant="confused"
            size="xl"
            enableHover
            enableClick
            hoverVariant="thinking"
            clickVariant="pointing"
            clickAnimation="wiggle"
            tooltip="Click for directions!"
          />
        </div>

        <div className="text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-neo-cyan to-neo-pink mb-4 font-neo-display">
          404
        </div>
        <h2 className="text-2xl font-black text-neo-white mb-2 uppercase font-neo-display">
          Page Not Found
        </h2>
        <p className="text-neo-white/70 mb-6 font-neo-body">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link
          href="/"
          className="inline-flex items-center justify-center px-6 py-3 bg-neo-cyan text-neo-black font-black uppercase border-3 border-neo-black rounded-neo shadow-hard hover:shadow-hard-lg hover:translate-x-[-2px] hover:translate-y-[-2px] active:shadow-hard-sm active:translate-x-[1px] active:translate-y-[1px] transition-all"
        >
          Back to Game
        </Link>
      </div>
    </div>
  );
}
