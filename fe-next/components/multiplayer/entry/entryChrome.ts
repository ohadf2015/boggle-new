// The one ENTRY module the page imports: it carries the entry's lazy islands
// into the route chunk group, keeping every async loader out of EntryScreen's
// SSR'd chunk group (see entryLazy.tsx).
import './entryLazy';

/**
 * Whether the global site chrome (AutoHideHeader, bottom nav) is hidden on the
 * MP entry screen. PageClient is the ONE writer of the nav-hiding state
 * (pitfall class 1) and reads this flag for the entry phase; ENTRY owns it.
 *
 * `true` (MP rebuild, DESIGN §b "Chrome"): the entry is a full-screen game
 * surface with its own header (home → mpExit('back-from-entry'), language,
 * sound, how-to-play). NavigationContext is client state, so the flag alone
 * would SSR the entry WITH chrome and drop it after hydration — a layout shift.
 * First paint is solved in CSS instead: EntryScreen renders
 * `[data-mp-entry-chrome="off"]` in its SSR HTML and `entryChrome.css` hides the
 * header, its flow spacer and the bottom nav whenever that marker is in the
 * document. The same stylesheet drops the hidden header's spacer under every
 * MpScreen: with the flag on, `isInGame` never flips on entering a room, so
 * AutoHideHeader's "collapse the spacer after a user tap" latch is computed once
 * at a cold load (no activation → keep spacer) and would otherwise leave a
 * 60–124px band above the lobby. Between those two, nothing carries a marker —
 * while the lazy entry chunk resolves after hydration, and while a room's lazy
 * view loads — so the spacer is also hidden for the whole route, keyed on the MP
 * layout's canonical <link> (MP_ROUTE_CANONICAL). Every rule is keyed to the MP
 * route itself, so leaving /multiplayer can never leave another page's chrome
 * hidden.
 *
 * Side effects of `isInGame` on entry, accepted on purpose: `body.screen-fit-
 * locked` suppresses the native ad banner (it would composite over the footer's
 * QUICK START), the PWA install prompt stands down, and VersionChecker waits for
 * the player to leave MP before offering a refresh.
 */
export const ENTRY_HIDES_GLOBAL_CHROME = true;

/** The SSR marker attribute `entryChrome.css` keys on. */
export const ENTRY_CHROME_ATTR = 'data-mp-entry-chrome';

/**
 * The MP layout's canonical <link>: present in the SSR <head> from the first
 * byte, and swapped by Next in the same commit that leaves the route — the one
 * route-scoped hook outside the lazy entry boundary. `entryChrome.css` keys its
 * route-wide spacer rule on it (pinned by entryChromeRoute.test.ts).
 */
export const MP_ROUTE_CANONICAL = "link[rel='canonical'][href$='/multiplayer']";
