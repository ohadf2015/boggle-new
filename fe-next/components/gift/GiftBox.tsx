import { cn } from '@/lib/utils';

/** The gift box: idle wiggle while closed, lid pops and a burst fires when `open`. */
export function GiftBox({ open, className }: { open: boolean; className?: string }) {
  return (
    <div className={cn('gift-box relative mx-auto h-32 w-32', className)} data-open={open} aria-hidden>
      <span className="gift-burst absolute inset-3 rounded-full border-4 border-neo-yellow" />
      <svg viewBox="0 0 120 120" className="gift-box-body absolute inset-0 h-full w-full overflow-visible">
        <g strokeLinejoin="round" className="stroke-neo-black" strokeWidth="4">
          <rect x="22" y="58" width="76" height="54" rx="6" className="fill-neo-pink" />
          <rect x="52" y="58" width="16" height="54" className="fill-neo-lime" />
          <path d="M26 58 L34 44 H86 L94 58 Z" className="gift-inside fill-neo-yellow" />
          <g className="gift-lid">
            <rect x="14" y="40" width="92" height="22" rx="6" className="fill-neo-pink" />
            <rect x="52" y="40" width="16" height="22" className="fill-neo-lime" />
            <path d="M60 40 C40 40 34 14 46 14 C56 14 60 30 60 40 Z" className="fill-neo-cyan" />
            <path d="M60 40 C80 40 86 14 74 14 C64 14 60 30 60 40 Z" className="fill-neo-cyan" />
            <circle cx="60" cy="40" r="6" className="fill-neo-yellow" />
          </g>
        </g>
        <path d="M30 70 V100" className="stroke-neo-cream" strokeWidth="3" strokeLinecap="round" opacity="0.45" />
      </svg>
      {[['-top-2 start-0', '0s'], ['top-4 -end-3', '0.4s'], ['bottom-2 -start-4', '0.8s'], ['-top-3 end-6', '1.2s']].map(([pos, delay]) => (
        <span key={pos} className={cn('gift-twinkle absolute text-neo-yellow', pos)} style={{ animationDelay: delay }}>✦</span>
      ))}
    </div>
  );
}
