/**
 * Whether the global site chrome (AutoHideHeader, bottom nav) is hidden on the
 * MP entry screen. PageClient is the ONE writer of the nav-hiding state
 * (pitfall class 1) and reads this flag for the entry phase; the ENTRY piece
 * owns the value.
 *
 * `false` today = unchanged behaviour. Flipping it hides the chrome only after
 * hydration (NavigationContext is client state), so the SSR'd entry would paint
 * WITH chrome and then drop it — a layout shift on the landing. ENTRY must give
 * the entry its own header (back via useMpExit('back-from-entry'), language,
 * sound) and solve first-paint before flipping this.
 */
export const ENTRY_HIDES_GLOBAL_CHROME = false;
