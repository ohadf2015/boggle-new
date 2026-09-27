import { describe, it, expect, beforeEach } from 'vitest';
import { useAndroidInstallStore } from '../androidInstallStore';

function reset() {
  useAndroidInstallStore.setState({
    open: false,
    source: 'auto_popup',
    pillVisible: true,
  });
}

describe('androidInstallStore', () => {
  beforeEach(reset);

  it('defaults the pill to visible so it is a persistent on-load entry point', () => {
    // The layout-mounted pill is the always-available "Get the app" affordance
    // for eligible Android browsers — not gated behind dismissing the popup.
    expect(useAndroidInstallStore.getInitialState().pillVisible).toBe(true);
  });

  it('starts closed with the pill available', () => {
    const s = useAndroidInstallStore.getState();
    expect(s.open).toBe(false);
    expect(s.pillVisible).toBe(true);
  });

  it('openPromo opens the popup tagged with the source and clears the pill', () => {
    useAndroidInstallStore.setState({ pillVisible: true });
    useAndroidInstallStore.getState().openPromo('menu');
    const s = useAndroidInstallStore.getState();
    expect(s.open).toBe(true);
    expect(s.source).toBe('menu');
    expect(s.pillVisible).toBe(false);
  });

  it('closePromo closes the popup but keeps the source for tracking', () => {
    useAndroidInstallStore.getState().openPromo('pill');
    useAndroidInstallStore.getState().closePromo();
    const s = useAndroidInstallStore.getState();
    expect(s.open).toBe(false);
    expect(s.source).toBe('pill');
  });

  it('showPill / hidePill toggle the session pill independently of the popup', () => {
    useAndroidInstallStore.getState().showPill();
    expect(useAndroidInstallStore.getState().pillVisible).toBe(true);
    useAndroidInstallStore.getState().hidePill();
    expect(useAndroidInstallStore.getState().pillVisible).toBe(false);
  });
});
