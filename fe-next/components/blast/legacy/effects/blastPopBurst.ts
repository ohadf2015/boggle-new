import gsap from 'gsap';

export interface PopBurstOptions {
  el: HTMLElement;
  color: string;
  onComplete?: () => void;
}

export interface PopBurstHandle {
  timeline: gsap.core.Timeline;
  dispose: () => void;
}

export function createPopBurst({ el, color, onComplete }: PopBurstOptions): PopBurstHandle {
  const tl = gsap.timeline({ paused: false });

  tl.set(el, {
    opacity: 1,
    scale: 0,
    boxShadow: `0 0 0 0 ${color}66`,
  });

  tl.fromTo(
    el,
    { scale: 0, opacity: 0 },
    {
      scale: 1.2,
      opacity: 1,
      duration: 0.32,
      ease: 'back.out(2.4)',
    },
  );

  tl.to(el, {
    scale: 1.6,
    opacity: 0,
    boxShadow: `0 0 24px 12px ${color}00`,
    duration: 0.42,
    ease: 'power2.out',
  });

  if (onComplete) {
    tl.eventCallback('onComplete', onComplete);
  }

  return {
    timeline: tl,
    dispose: () => tl.kill(),
  };
}
