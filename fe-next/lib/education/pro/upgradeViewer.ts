export type UpgradeViewer = 'loading' | 'anon' | 'free' | 'pro' | 'unknown';

export interface UpgradeViewerSignals {
  authLoading: boolean;
  signedIn: boolean;
  proLoading: boolean;
  known: boolean;
  hasPro: boolean;
}

export function upgradeViewer({ authLoading, signedIn, proLoading, known, hasPro }: UpgradeViewerSignals): UpgradeViewer {
  if (authLoading) return 'loading';
  if (!signedIn) return 'anon';
  if (proLoading) return 'loading';
  if (!known) return 'unknown';
  return hasPro ? 'pro' : 'free';
}

/**
 * Whether the Pro card leads with the free trial (badge + main CTA).
 *
 * `loading` is treated like `anon`: the server render and the first client paint happen before
 * auth resolves, and most visitors to the upgrade page are signed out. Showing the paid CTA there
 * meant crawlers / no-JS saw "Get Teacher Pro" while the FAQ promised a trial, then signed-out
 * visitors watched it flip to the trial. Once auth and the entitlement resolve, Pro, trial-used
 * and unknown accounts drop the trial; checkout re-checks eligibility server-side either way.
 */
export function showTrialOffer(viewer: UpgradeViewer, offerTrial: boolean): boolean {
  if (viewer === 'anon' || viewer === 'loading') return true;
  return viewer === 'free' && offerTrial;
}
