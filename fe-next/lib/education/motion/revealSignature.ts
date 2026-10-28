/** One entrance per visit, dealt at mount, so the teacher pages never land the same way twice. */

export interface RevealSignature {
  readonly name: 'rise' | 'slide' | 'pop' | 'swing' | 'flip';
  /** GSAP ease for the teacher pages; `css` is the matching curve for CSS-only surfaces. */
  readonly ease: string;
  readonly css: string;
  readonly duration: number;
  readonly stagger: number;
  readonly from: 'start' | 'center' | 'edges' | 'random';
  readonly x: number;
  readonly y: number;
  readonly rotate: number;
  readonly scale: number;
  readonly rotateX: number;
  /** Siblings enter from opposite sides. */
  readonly alternate: boolean;
  /** Random spread added per element on top of the base offset. */
  readonly jitter: number;
}

export const REVEAL_SIGNATURES: readonly RevealSignature[] = [
  { name: 'rise', ease: 'power3.out', css: 'cubic-bezier(0.23,1,0.32,1)', duration: 0.55, stagger: 0.07, from: 'start', x: 0, y: 26, rotate: 0, scale: 1, rotateX: 0, alternate: false, jitter: 6 },
  { name: 'slide', ease: 'expo.out', css: 'cubic-bezier(0.16,1,0.3,1)', duration: 0.6, stagger: 0.06, from: 'start', x: 44, y: 6, rotate: 0, scale: 1, rotateX: 0, alternate: true, jitter: 10 },
  { name: 'pop', ease: 'back.out(1.7)', css: 'cubic-bezier(0.34,1.56,0.64,1)', duration: 0.5, stagger: 0.05, from: 'center', x: 0, y: 12, rotate: 0, scale: 0.9, rotateX: 0, alternate: false, jitter: 4 },
  { name: 'swing', ease: 'back.out(1.4)', css: 'cubic-bezier(0.34,1.4,0.64,1)', duration: 0.6, stagger: 0.07, from: 'edges', x: 0, y: 22, rotate: 4, scale: 0.96, rotateX: 0, alternate: true, jitter: 6 },
  { name: 'flip', ease: 'power4.out', css: 'cubic-bezier(0.23,1,0.32,1)', duration: 0.65, stagger: 0.06, from: 'random', x: 0, y: 14, rotate: 0, scale: 0.97, rotateX: -28, alternate: false, jitter: 4 },
];

type Rand = () => number;

export function pickRevealSignature(rand: Rand = Math.random): RevealSignature {
  return REVEAL_SIGNATURES[Math.min(REVEAL_SIGNATURES.length - 1, Math.floor(rand() * REVEAL_SIGNATURES.length))];
}

/** Where element `index` starts, before it settles to rest. */
export function entranceOffset(sig: RevealSignature, index: number, rand: Rand = Math.random) {
  const spread = () => (rand() * 2 - 1) * sig.jitter;
  const side = sig.alternate && index % 2 === 1 ? 1 : -1;
  return {
    x: sig.x * side + (sig.x ? spread() : 0),
    y: sig.y + spread() / 2,
    rotate: sig.rotate * (sig.alternate ? -side : 1) + (sig.rotate ? spread() / 4 : 0),
    scale: sig.scale,
    rotateX: sig.rotateX,
  };
}
