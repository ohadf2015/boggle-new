const noop = () => {};
const sfx = new Proxy({}, { get: () => noop });
export const useSoundEffects = () => sfx;
