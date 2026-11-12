export interface PhoneMascotClip {
  src: string;
  durationMs: number;
  /** windup + action: when the voice line lands. */
  freezeMs: number;
  width: number;
  height: number;
}

export const PHONE_MASCOT_CLIPS: Record<'celebrate' | 'faceplant', PhoneMascotClip> = {
  celebrate: { src: '/mascot/anim/joy-jump.webp', durationMs: 2656, freezeMs: 1000, width: 288, height: 244 },
  faceplant: { src: '/mascot/anim/faceplant-thumbsup.webp', durationMs: 2905, freezeMs: 850, width: 280, height: 288 },
};
