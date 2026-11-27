/** The word-hunt layout's navy/white pieces, with the classroom (sky page) variant. */
export function wordHuntLayoutSkin(classroom: boolean) {
  return classroom
    ? {
        healHint: 'shrink-0 px-2 text-center text-[11px] sm:text-xs font-neo-body text-edu-ink leading-tight',
        skeleton: 'mx-auto max-w-3xl w-full px-3 py-2 mb-0.5 rounded-neo-lg bg-edu-surface border-2 border-neo-black animate-pulse',
        skeletonTitle: 'text-center mb-2 text-xl sm:text-2xl font-black text-edu-ink',
        skeletonTile: 'w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center border-2 border-dashed rounded-neo font-bold bg-edu-tile border-edu-line/50 text-edu-ink',
      }
    : {
        healHint: 'shrink-0 px-2 text-center text-[11px] sm:text-xs font-neo-body text-neo-white leading-tight',
        skeleton: 'mx-auto max-w-3xl w-full px-3 py-2 mb-0.5 rounded-neo-lg bg-neo-navy/30 dark:bg-neo-navy/50 border-2 border-neo-black/20 animate-pulse',
        skeletonTitle: 'text-center mb-2 text-xl sm:text-2xl font-black text-neo-white',
        skeletonTile: 'w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center border-2 rounded-neo font-bold shadow-hard bg-neo-black/60 border-neo-black text-neo-white',
      };
}
