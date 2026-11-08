/**
 * The play screen's height.
 *
 * In game the body is a 100dvh box padded down by the status bar
 * (`body.screen-fit-locked`, globals.css), so a 100dvh child ran one status bar
 * past the bottom of the screen: on Android the build button was cut off under
 * the gesture bar (Nov 2026). Subtract exactly what the body pads.
 *
 * Bottom-pinned controls pair the env() bottom inset with
 * `var(--cap-safe-area-bottom)`: inside the Android app (edge-to-edge) the
 * WebView reports 0 for env() while the page still draws behind the gesture
 * bar, and the real inset only arrives through the var useSafeArea() sets.
 */
export const PLAY_HEIGHT = 'calc(100dvh - var(--combined-safe-area-top, env(safe-area-inset-top, 0px)))';
