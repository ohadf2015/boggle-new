/**
 * Maps the pure `iconKey` strings from lib/admin/adminNav to lucide
 * components. Lives in the React layer so the nav config stays pure.
 */
import {
  LayoutDashboard,
  BookOpen,
  ShieldAlert,
  Users,
  Menu,
  BarChart3,
  Settings,
  Activity,
  LogOut,
  AlertTriangle,
  BookCheck,
  Calendar,
  Globe,
  Database,
  Puzzle,
  Languages,
  GraduationCap,
  UserRound,
  Ban,
  type LucideIcon,
} from 'lucide-react';

export const ADMIN_NAV_ICONS: Record<string, LucideIcon> = {
  LayoutDashboard,
  BookOpen,
  ShieldAlert,
  Users,
  Menu,
  BarChart3,
  Settings,
  Activity,
  LogOut,
  AlertTriangle,
  BookCheck,
  Calendar,
  Globe,
  Database,
  Puzzle,
  Languages,
  GraduationCap,
  UserRound,
  Ban,
};

/** Safe lookup with a sensible fallback so an unknown key never crashes. */
export function getAdminNavIcon(iconKey: string): LucideIcon {
  return ADMIN_NAV_ICONS[iconKey] ?? Menu;
}
