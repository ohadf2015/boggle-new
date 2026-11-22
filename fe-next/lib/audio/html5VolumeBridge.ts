/**
 * iOS/iPadOS Safari ignores writes to HTMLMediaElement.volume (it always reads 1),
 * so every html5 Howl played at full volume whatever the music/SFX slider said.
 * On those browsers each Howler pool node is routed through a Web Audio GainNode
 * and its `volume`/`muted` writes are redirected to the gain.
 */

interface HowlerLike {
  ctx: AudioContext | null;
  autoSuspend: boolean;
  _obtainHtml5Audio: () => HTMLAudioElement;
}

export function mediaVolumeIsReadOnly(): boolean {
  if (typeof Audio === 'undefined') return false;
  try {
    const probe = new Audio();
    probe.volume = 0.5;
    return probe.volume !== 0.5;
  } catch {
    return false;
  }
}

const bridged = new WeakSet<HTMLMediaElement>();

function findSetter(node: HTMLMediaElement, prop: string): ((v: unknown) => void) | undefined {
  for (let o: object | null = node; o; o = Object.getPrototypeOf(o)) {
    const desc = Object.getOwnPropertyDescriptor(o, prop);
    if (desc) return desc.set;
  }
  return undefined;
}

function bridgeNode(node: HTMLMediaElement, ctx: AudioContext): void {
  if (bridged.has(node)) return;
  let gain: GainNode;
  try {
    // Must precede Howler's src assignment, or a CDN source is CORS-tainted and the graph outputs silence.
    node.crossOrigin = 'anonymous';
    const source = ctx.createMediaElementSource(node);
    gain = ctx.createGain();
    source.connect(gain);
    gain.connect(ctx.destination);
  } catch {
    return;
  }
  bridged.add(node);

  const nativeMuted = findSetter(node, 'muted');
  let volume = 1;
  let muted = node.muted;
  const apply = () => { gain.gain.value = muted ? 0 : volume; };

  Object.defineProperty(node, 'volume', {
    configurable: true,
    get: () => volume,
    set: (v: number) => { volume = v; apply(); },
  });
  Object.defineProperty(node, 'muted', {
    configurable: true,
    get: () => muted,
    set: (m: boolean) => { muted = !!m; nativeMuted?.call(node, m); apply(); },
  });
  node.addEventListener('play', () => {
    if (ctx.state !== 'running') ctx.resume().catch(() => {});
  });
  apply();
}

export function routeHtml5VolumeThroughGain(howler: HowlerLike): void {
  // Howler suspends its context 30s after setup when no Web Audio sound plays; routed html5 audio would go silent.
  howler.autoSuspend = false;
  // Keep html5 audio's session: Web Audio defaults to ambient, which the iOS silent switch mutes.
  const session = (navigator as { audioSession?: { type: string } }).audioSession;
  if (session) session.type = 'playback';
  const obtain = howler._obtainHtml5Audio;
  howler._obtainHtml5Audio = function (this: unknown) {
    const node = obtain.call(this);
    if (howler.ctx) bridgeNode(node, howler.ctx);
    return node;
  };
}
