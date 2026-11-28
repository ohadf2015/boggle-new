import { useSyncExternalStore } from 'react';

const listeners = new Set<() => void>();
const subscribe = (fn: () => void) => {
  listeners.add(fn);
  window.addEventListener('popstate', fn);
  return () => {
    listeners.delete(fn);
    window.removeEventListener('popstate', fn);
  };
};
const go = (url: string) => {
  const next = new URL(url, location.href);
  history.pushState(null, '', `/${next.search}`);
  listeners.forEach((fn) => fn());
};

export const useRouter = () => ({ push: go, replace: () => {} });
export const usePathname = () => '/en/holiday-arcade';
export const useSearchParams = () => new URLSearchParams(useSyncExternalStore(subscribe, () => location.search));
