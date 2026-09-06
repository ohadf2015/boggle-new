/**
 * Tab identity and motion variants for the teacher dashboard.
 *
 * Split out of `TeacherDashboard.tsx` to keep that file under the 500-line cap.
 * `Tab` is re-exported from the deep-link hook, which is what validates a `?tab=`
 * value coming off the URL — one definition of "what is a real tab id", so a new
 * tab cannot be linkable in one place and unknown in the other.
 */
import { Gamepad2, BookOpen, BarChart3 } from 'lucide-react';
import type { TeacherTab } from '@/hooks/useTeacherDashboardDeepLink';

export type Tab = TeacherTab;

export const tabConfig: {
  id: Tab;
  icon: typeof Gamepad2;
  color: string;
  activeBg: string;
  activeText: string;
}[] = [
  { id: 'play', icon: Gamepad2, color: 'neo-cyan', activeBg: 'bg-neo-cyan', activeText: 'text-black' },
  { id: 'prepare', icon: BookOpen, color: 'neo-pink', activeBg: 'bg-neo-pink', activeText: 'text-black' },
  { id: 'review', icon: BarChart3, color: 'neo-lime', activeBg: 'bg-neo-lime', activeText: 'text-black' },
];

export const fadeSlide = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 26 } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.15 } },
};

export const stagger = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
};

export const slideUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 320, damping: 24 } },
};
