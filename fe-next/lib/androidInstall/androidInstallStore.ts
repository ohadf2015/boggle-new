/**
 * Shared in-memory UI state for the Android install promo.
 *
 * Why a store: the popup mounts at the layout root while its re-entry triggers
 * (the header menu row, the session pill) live elsewhere in the tree. They all
 * need to drive one "open the promo" surface. Storage writes (cooldown) and
 * PostHog stay in the component handlers — this store holds only ephemeral UI
 * state so it stays trivially testable.
 */

import { create } from 'zustand';
import type { InstallSource } from './installTracking';

interface AndroidInstallState {
  /** popup dialog open */
  open: boolean;
  /** which surface opened the popup — drives source-tagged tracking */
  source: InstallSource;
  /** session pill currently visible — defaults true so it's a persistent on-load entry, not just a post-dismiss fallback; resets on reload */
  pillVisible: boolean;
  openPromo: (source: InstallSource) => void;
  closePromo: () => void;
  showPill: () => void;
  hidePill: () => void;
}

export const useAndroidInstallStore = create<AndroidInstallState>((set) => ({
  open: false,
  source: 'auto_popup',
  pillVisible: true,
  // Opening the popup always supersedes the collapsed pill.
  openPromo: (source) => set({ open: true, source, pillVisible: false }),
  // Keep `source` so the dismiss handler can attribute correctly after close.
  closePromo: () => set({ open: false }),
  showPill: () => set({ pillVisible: true }),
  hidePill: () => set({ pillVisible: false }),
}));
