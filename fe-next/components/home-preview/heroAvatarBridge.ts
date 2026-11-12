'use client';

import { useSyncExternalStore } from 'react';
import type { CustomAvatarConfig } from '@/shared/types/customAvatar';

/**
 * Hands every avatar the homepage renders to a lazy island that lives OUTSIDE
 * LandingView's module graph. The avatar SVG part library (avatar/parts/*,
 * the 477 KiB chunk 65990) must never be reachable from LandingView — anything
 * reachable there, via a static import OR a literal `import('...')`, webpack
 * associates with the landing route and ships as first-paint JS
 * (LandingView.bundleGraph.test.ts). So home-preview components own their
 * LAYOUT and publish bare slot <div>s (plus the hero's avatar props) through
 * this bridge; HeroAvatarMount (rendered by PageClient, which LandingView
 * never imports) loads the island chunk with a runtime import() and portals
 * the avatars and the edit button into those slots. Same writer/reader shape
 * as freshPlayBridge.
 */
export type HeroAvatarSlotName = 'hero' | 'heroEdit' | 'friendsYou' | 'friendsRival';

export interface HeroAvatarBridgeProps {
  userId: string;
  customAvatar: CustomAvatarConfig | null;
  t: (key: string) => string;
  onAvatarSaved: (config: CustomAvatarConfig) => void;
}

export interface HeroAvatarBridgeState {
  slots: Readonly<Partial<Record<HeroAvatarSlotName, HTMLElement | null>>>;
  heroProps: HeroAvatarBridgeProps | null;
  /** FriendsBlock's `showAvatars` gate (post-mount), so SSR/hydration match. */
  friendsAvatars: boolean;
  /** Real players' faces in the home crew card, keyed by row. */
  crew: Readonly<Record<string, CrewAvatarSlotState>>;
}

export interface CrewAvatarSlotState {
  el: HTMLElement;
  userId: string;
  customAvatar: CustomAvatarConfig | null;
  avatarImage: string | null;
  pixelSize: number;
}

const EMPTY: HeroAvatarBridgeState = { slots: {}, heroProps: null, friendsAvatars: false, crew: {} };

let current: HeroAvatarBridgeState = EMPTY;
const listeners = new Set<() => void>();

function emit(partial: Partial<HeroAvatarBridgeState>): void {
  current = { ...current, ...partial };
  listeners.forEach((notify) => notify());
}

export function setHeroAvatarSlot(name: HeroAvatarSlotName, el: HTMLElement | null): void {
  if (current.slots[name] === el) return;
  emit({ slots: { ...current.slots, [name]: el } });
}

export function setHeroAvatarProps(heroProps: HeroAvatarBridgeProps | null): void {
  if (current.heroProps === heroProps) return;
  emit({ heroProps });
}

export function setCrewAvatarSlot(key: string, slot: CrewAvatarSlotState | null): void {
  const prev = current.crew[key];
  if (!slot && !prev) return;
  if (slot && prev && prev.el === slot.el && prev.userId === slot.userId && prev.customAvatar === slot.customAvatar && prev.avatarImage === slot.avatarImage && prev.pixelSize === slot.pixelSize) return;
  const crew = { ...current.crew };
  if (slot) crew[key] = slot;
  else delete crew[key];
  emit({ crew });
}

export function setFriendsAvatarsEnabled(friendsAvatars: boolean): void {
  if (current.friendsAvatars === friendsAvatars) return;
  emit({ friendsAvatars });
}

const SERVER_SNAPSHOT = EMPTY;

function subscribe(notify: () => void): () => void {
  listeners.add(notify);
  return () => {
    listeners.delete(notify);
  };
}

/** Slots + props the homepage published, or EMPTY on the server / before mount. */
export function useHeroAvatarBridge(): HeroAvatarBridgeState {
  return useSyncExternalStore(subscribe, () => current, () => SERVER_SNAPSHOT);
}
