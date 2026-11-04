import { EDU_MOTION } from './tokens';

export type PressMotionProps =
  | { whileTap: { scale: number }; transition: (typeof EDU_MOTION.spring)['press'] }
  | Record<string, never>;

/** Spread on an `m.*` element next to pressClasses(): scale from here, shadow lip from the classes. */
export function pressMotion(reduced: boolean): PressMotionProps {
  if (reduced) return {};
  return { whileTap: { scale: EDU_MOTION.press.scale }, transition: EDU_MOTION.spring.press };
}
