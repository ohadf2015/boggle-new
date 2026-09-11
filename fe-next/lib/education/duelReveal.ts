/**
 * Duel reveal art — which mascot clip carries which result.
 *
 * Lives outside the component so the paths are testable: a <video> whose src
 * 404s does not throw, it just sits on its poster forever, which is
 * indistinguishable from "the clip is still loading" (recurring-pitfalls
 * Class 4). lib/education/__tests__/duelAssets.test.ts asserts every path here
 * resolves to a file under public/.
 *
 * The win clip is deliberately `celebration-champion-4`, not -2 or -3: those two
 * have English letters baked into the frame, and this screen ships in six
 * locales including Hebrew and Japanese. -4 is also a third of the bytes, which
 * matters on the phone this is played on.
 */

export type DuelOutcome = 'win' | 'loss' | 'draw';

export interface DuelRevealClip {
  /** Short mascot loop, already shipping under public/mascots. */
  src: string;
  /**
   * Transparent still of the same character. It paints instantly, so the first
   * frame of the reveal is the mascot rather than a black rectangle — and it is
   * what a reduced-motion viewer keeps.
   */
  poster: string;
  /** Banner fill for this result. */
  accent: string;
  /** i18n key for the headline. */
  titleKey: string;
}

export const DUEL_REVEAL_CLIPS: Record<DuelOutcome, DuelRevealClip> = {
  win: {
    src: '/mascots/celebration-champion-4.mp4',
    poster: '/mascot/trophy-nobg.webp',
    accent: 'bg-neo-lime',
    titleKey: 'education.duels.revealWin',
  },
  loss: {
    src: '/mascots/celebration-defeat.mp4',
    poster: '/mascot/crying-nobg.webp',
    accent: 'bg-neo-pink',
    titleKey: 'education.duels.revealLose',
  },
  draw: {
    src: '/mascots/celebration-runner-up.mp4',
    poster: '/mascot/gg.webp',
    accent: 'bg-neo-cyan',
    titleKey: 'education.duels.revealDraw',
  },
};
