import {
  BedDouble, BookOpen, Building, Building2, Clock, Croissant, Fish, Flower2,
  Gamepad2, type LucideIcon, Music, RadioTower, Sailboat, Ship, TowerControl, Warehouse,
} from 'lucide-react';
import type { PlotIconId } from './estateArt';

/**
 * The glyph each building type wears on its name plate — the identity channel
 * that still works at phone size, where a silhouette alone may not.
 *
 * Kept out of PlotCard so a test can prove the five types on ONE district
 * screen never share a component (distinct `PlotIconId` strings would not: two
 * ids could point at the same icon).
 */
export const PLOT_ICON_COMPONENTS: Record<PlotIconId, LucideIcon> = {
  croissant: Croissant,
  apartments: Building2,
  book: BookOpen,
  clock: Clock,
  flower: Flower2,
  fish: Fish,
  lighthouse: TowerControl,
  sailboat: Sailboat,
  warehouse: Warehouse,
  ship: Ship,
  arcade: Gamepad2,
  bed: BedDouble,
  skytower: Building,
  radio: RadioTower,
  music: Music,
};
