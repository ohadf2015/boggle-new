/**
 * Shared layout for the two mode intros (Workshop VS arena, Review vault).
 *
 * Three tiers:
 *  - portrait / narrow: hero on top (flex-1), copy + CTA stacked under it;
 *  - short landscape (a phone on its side, <=520px tall): hero and copy side by side — a stacked hero gets ~100px there;
 *  - lg: side by side, every size clamped by BOTH vw and vh (1024x768 and 1280x720 are short for their width).
 * The hero is a size container: everything inside it is sized in cq units, so it scales with the card, not the window.
 * Class strings must stay literal for Tailwind's scanner — no interpolation.
 */
export const INTRO_LAYOUT =
  'flex h-full min-h-0 w-full flex-col items-center gap-2 [@media(orientation:landscape)_and_(max-height:520px)]:grid [@media(orientation:landscape)_and_(max-height:520px)]:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] [@media(orientation:landscape)_and_(max-height:520px)]:grid-rows-[minmax(0,1fr)] [@media(orientation:landscape)_and_(max-height:520px)]:items-center [@media(orientation:landscape)_and_(max-height:520px)]:gap-5 lg:grid lg:max-w-[150rem] lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:grid-rows-[minmax(0,1fr)] lg:items-center lg:gap-[clamp(1.5rem,3vw,4rem)]';

export const INTRO_HERO =
  'relative min-h-0 w-full flex-1 [container-type:size] [@media(orientation:landscape)_and_(max-height:520px)]:h-full lg:h-full';

export const INTRO_COPY =
  'flex w-full max-w-md shrink-0 flex-col items-center text-center sm:max-w-xl [@media(orientation:landscape)_and_(max-height:520px)]:max-w-none [@media(orientation:landscape)_and_(max-height:520px)]:items-start [@media(orientation:landscape)_and_(max-height:520px)]:text-start lg:max-w-none lg:items-start lg:text-start';

export const INTRO_KICKER =
  'min-h-4 font-neo-display text-xs font-black uppercase tracking-widest lg:min-h-[1.2em] lg:text-[clamp(0.9rem,min(1.6vw,2.6vh),1.75rem)]';

export const INTRO_TITLE =
  'mb-2 font-neo-display text-3xl font-black uppercase leading-none text-neo-white sm:text-5xl [@media(orientation:landscape)_and_(max-height:520px)]:mb-2! [@media(orientation:landscape)_and_(max-height:520px)]:text-[clamp(1.4rem,9vh,2.6rem)]! lg:mb-[clamp(0.75rem,2.5vh,1.5rem)]';

export const INTRO_CTA =
  'relative flex min-h-[4.25rem] w-full items-center justify-center gap-3 overflow-hidden rounded-neo border-[3px] border-black px-4 font-neo-display font-black uppercase tracking-wide text-black disabled:opacity-60 [@media(orientation:landscape)_and_(max-height:520px)]:min-h-[3.25rem]! lg:min-h-[clamp(4.25rem,11vh,9rem)] lg:max-w-[clamp(36rem,30vw,50rem)]';
