const noopTween = {
  kill: () => noopTween,
  pause: () => noopTween,
  play: () => noopTween,
  reverse: () => noopTween,
  progress: (_v?: number) => 0,
  duration: (_v?: number) => 0,
  then: (cb: () => void) => { cb(); return noopTween; },
  invalidate: () => noopTween,
};

const noopTimeline: Record<string, unknown> = {};
['to','from','fromTo','set','add','addLabel','call','kill','pause','play','reverse'].forEach(k => {
  noopTimeline[k] = (..._args: unknown[]) => noopTimeline;
});
noopTimeline.progress = (_v?: number) => 0;
noopTimeline.duration = (_v?: number) => 0;
noopTimeline.then = (cb: () => void) => { cb(); return noopTimeline; };

const gsap = {
  to: (..._args: unknown[]) => noopTween,
  from: (..._args: unknown[]) => noopTween,
  fromTo: (..._args: unknown[]) => noopTween,
  set: (..._args: unknown[]) => noopTween,
  timeline: (..._args: unknown[]) => noopTimeline,
  registerPlugin: (..._args: unknown[]) => {},
  killTweensOf: (..._args: unknown[]) => {},
  getProperty: (..._args: unknown[]) => 0,
  defaults: (_vars: unknown) => ({}),
  config: (_vars: unknown) => ({}),
  ticker: {
    add: () => {},
    remove: () => {},
    sleep: () => {},
    wake: () => {},
    lagSmoothing: () => {},
    fps: () => 60,
  },
  utils: {
    clamp: (min: number, max: number, v: number) => Math.min(Math.max(v, min), max),
    mapRange: (..._args: unknown[]) => 0,
    interpolate: (..._args: unknown[]) => 0,
    toArray: (v: unknown) => (Array.isArray(v) ? v : [v]),
    selector: () => () => [],
  },
  context: (_fn?: unknown) => ({ revert: () => {}, add: () => {} }),
  matchMedia: () => ({}),
  effects: {},
  version: '3.12.0',
};

export default gsap;
export { gsap };
export const { to, from, fromTo, set, timeline, registerPlugin, killTweensOf, ticker, utils, context } = gsap;
