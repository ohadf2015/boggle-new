import { AdMob, BannerAdPluginEvents } from '@capacitor-community/admob';

/** Longest we wait for the plugin to confirm the AdView is gone. */
export const REMOVE_CONFIRM_TIMEOUT_MS = 600;

/**
 * Destroy the native AdMob banner and resolve once it is really gone.
 *
 * removeBanner() resolves BEFORE the AdView is torn down (the teardown is
 * posted to the UI thread), and the plugin decides "create vs. reuse" by
 * checking that AdView. A showBanner() sent right after could still see the old
 * view and only reload it at the old margin. The teardown ends with a
 * SizeChanged(0) event, so wait for that, bounded: with no banner on screen the
 * plugin emits nothing.
 */
export function removeNativeBanner(timeoutMs = REMOVE_CONFIRM_TIMEOUT_MS): Promise<void> {
  return new Promise<void>((resolve) => {
    let done = false;
    let handle: { remove: () => Promise<void> | void } | null = null;
    const finish = () => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      void handle?.remove();
      resolve();
    };
    const timer = setTimeout(finish, timeoutMs);
    AdMob.addListener(BannerAdPluginEvents.SizeChanged, (info: { height?: number } | undefined) => {
      if ((info?.height ?? 0) === 0) finish();
    })
      .then((h) => {
        handle = h;
        if (done) void h.remove();
      })
      .catch(() => {});
    AdMob.removeBanner().catch(finish);
  });
}
