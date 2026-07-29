/**
 * CrazyGames SDK Injector
 *
 * Handles CrazyGames SDK lifecycle events on the server side,
 * including deferred game loading stop signaling using requestIdleCallback
 * with a setTimeout fallback for environments that don't support it.
 */

/**
 * Signals to the CrazyGames SDK that the game has finished loading.
 * Uses requestIdleCallback to defer the call until the browser is idle,
 * with a setTimeout fallback for unsupported environments.
 *
 * @param sdk - The CrazyGames SDK instance
 */
export function deferSdkGameLoadingStop(sdk: { game: { sdkGameLoadingStop: () => void } }): void {
  const stop = () => sdk.game.sdkGameLoadingStop();

  if (typeof requestIdleCallback !== 'undefined') {
    requestIdleCallback(stop, { timeout: 2000 });
  } else {
    setTimeout(stop, 0);
  }
}
