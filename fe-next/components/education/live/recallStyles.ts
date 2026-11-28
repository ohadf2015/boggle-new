/** Transform-only keyframes (Class 5: no opacity tweens); the fuse is the one long-running animation and it only drains a bonus. */
export const RECALL_KEYFRAMES =
  '@keyframes recall-pop{0%{transform:scale(0.88)}60%{transform:scale(1.06)}100%{transform:scale(1)}}' +
  '@keyframes recall-float{0%{transform:translateY(8px) scale(0.7)}70%{transform:translateY(-3px) scale(1.12)}100%{transform:translateY(0) scale(1)}}' +
  '@keyframes recall-shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-7px) rotate(-1deg)}45%{transform:translateX(6px) rotate(1deg)}70%{transform:translateX(-3px)}}' +
  '@keyframes recall-flip{0%{transform:perspective(600px) rotateY(80deg) scale(0.94)}100%{transform:perspective(600px) rotateY(0) scale(1)}}' +
  '@keyframes recall-star{0%{transform:scale(0.5) rotate(-25deg)}65%{transform:scale(1.2) rotate(6deg)}100%{transform:scale(1) rotate(0)}}' +
  '@keyframes recall-fuse{0%{transform:scaleX(1)}100%{transform:scaleX(0)}}';

/** Four answer colours, always in this order, so each tile reads as its own button at a glance. */
export const RECALL_FILLS = ['bg-neo-pink', 'bg-neo-cyan', 'bg-neo-yellow', 'bg-neo-lime'] as const;

export const RECALL_TILE =
  'relative inline-flex min-h-16 items-center justify-center rounded-neo-lg border-[3px] border-neo-black px-3 py-2 text-center font-neo-display text-lg font-black leading-tight text-neo-black shadow-hard-sm transition-[transform,box-shadow] duration-100 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan motion-reduce:transition-none';
