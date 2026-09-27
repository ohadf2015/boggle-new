const ScrollTrigger = {
  create: (_vars?: unknown) => ({ kill: () => {}, enable: () => {}, disable: () => {} }),
  refresh: (_safe?: boolean) => {},
  update: () => {},
  getAll: () => [] as unknown[],
  kill: (_revert?: boolean) => {},
  clearScrollMemory: () => {},
  addEventListener: (_type: string, _callback: () => void) => {},
  removeEventListener: (_type: string, _callback: () => void) => {},
  enable: () => {},
  disable: () => {},
  config: (_vars: unknown) => {},
  defaults: (_vars: unknown) => {},
  batch: (_targets: unknown, _vars: unknown) => [],
  register: (..._plugins: unknown[]) => {},
  isTouch: 0,
  version: '3.12.0',
};

export { ScrollTrigger };
export default ScrollTrigger;
