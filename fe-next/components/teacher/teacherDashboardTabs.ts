/**
 * Motion variants for the teacher dashboard.
 *
 * Split out of `TeacherDashboard.tsx` to keep that file under the 500-line cap.
 * The `Tab` identity and `tabConfig` that used to live here went with the tab
 * bar: the dashboard is one screen now, so there is nothing to switch between.
 */
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
