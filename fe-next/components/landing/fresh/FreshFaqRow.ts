/**
 * One row shell for the homepage FAQ card (homepage gauntlet, round 6).
 *
 * The question rows (HomepageContentSection) and the "N more questions" fold
 * (FreshFaqMore) wear exactly these classes, so at rest the page shows ONE
 * accordion of four rows, not rows plus a differently styled toggle
 * (fresh.shell.r6.faqCard.test). Each toggle is a small cream game tile, like
 * the hero's letters. Every row also names its own Tailwind group
 * (group/faq, group/more) so an open fold never spins the toggles of the
 * questions nested inside it.
 *
 * Literal class strings only (Tailwind v4 generates what it can read).
 */
export const FAQ_ROW =
  'rounded-neo border-2 border-neo-cream/25 bg-neo-navy transition-colors open:border-neo-pink';

export const FAQ_SUMMARY =
  'flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 py-2 pe-2 ps-4 font-neo-body text-base font-bold leading-snug text-neo-cream marker:hidden hover:text-neo-cyan focus-visible:rounded-neo focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neo-cyan [&::-webkit-details-marker]:hidden';

export const FAQ_TOGGLE =
  'flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] border-2 border-neo-black bg-neo-cream text-neo-black shadow-hard-sm';

export const FAQ_ANSWER = 'px-4 pb-4 font-neo-body text-sm leading-relaxed text-neo-cream/85 md:text-base';
