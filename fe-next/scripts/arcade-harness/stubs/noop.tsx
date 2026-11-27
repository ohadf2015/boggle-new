const noop = () => {};
export const useHideNavigation = () => noop;
export const trackGameStart = noop;
export const trackGameEnd = noop;
export const trackGrowthEvent = noop;
export const hasSupabaseSession = () => false;
export default function Nothing() {
  return null;
}
