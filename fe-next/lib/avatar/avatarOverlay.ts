/**
 * Avatar reaction overlays — pure policy.
 *
 * A face-swap is the charm detail, but at ~48px on a TV / party screen it's too
 * subtle to read across a room. An overlay is a loud, glanceable badge drawn on
 * top of the avatar that accompanies the highest-signal reactions so the drama
 * reads from a distance. Deliberately NOT shown for ordinary scores — every-word
 * badges would be noise; overlays are reserved for the moments that matter.
 */
import type { AvatarMood } from '@/lib/avatar/avatarMood';

export type AvatarOverlay = 'alert' | 'flame';

/** Map a transient mood to its loud overlay badge, or null for no overlay. */
export function moodToOverlay(mood?: AvatarMood): AvatarOverlay | null {
  switch (mood) {
    case 'emoteShock': // just got overtaken — loud "!" so the upset reads on TV
      return 'alert';
    case 'streak': // big word / hot combo — flame
      return 'flame';
    default:
      return null;
  }
}
