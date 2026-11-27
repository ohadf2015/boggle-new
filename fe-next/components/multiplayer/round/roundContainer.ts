/**
 * The in-round container for the round frame: dark-only (hardcoded navy, never
 * a cream/dark pair — pitfall class 5), the classic md+ gutter, and NO scroll
 * region — the round is one screen at every size.
 */
export const MP_ROUND_CONTAINER_CLASS = 'relative flex-1 flex flex-col min-h-0 bg-neo-navy overflow-hidden p-0 md:p-4';

/** The classroom round on the sky page: same frame, page colour instead of navy. */
export const MP_ROUND_CONTAINER_CLASSROOM_CLASS = MP_ROUND_CONTAINER_CLASS.replace('bg-neo-navy', 'bg-edu-page');
