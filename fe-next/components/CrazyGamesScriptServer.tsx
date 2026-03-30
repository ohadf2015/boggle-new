/**
 * CrazyGames SDK Script — Placeholder Component
 *
 * The actual SDK script injection happens at the Express middleware layer
 * (server/crazyGamesInjector.ts) because:
 * - Raw <script> tags in Next.js Server Components are stripped from HTML
 * - next/script beforeInteractive doesn't work with custom Express servers
 * - CrazyGames QA tool requires the SDK script in the initial HTML source
 *
 * This component is kept as a no-op to avoid breaking layout imports.
 * The bootstrap logic (iframe detection, SDK init, gameLoadingStart/Stop)
 * lives in the injector middleware.
 */

export default function CrazyGamesScriptServer() {
  return null;
}
