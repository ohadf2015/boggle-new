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

export function showTrialOffer(viewer: UpgradeViewer, offerTrial: boolean): boolean {
  if (viewer === 'anon') return true;
  return viewer === 'free' && offerTrial;
}
