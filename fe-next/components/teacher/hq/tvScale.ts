/**
 * TV scale for the teacher shell (Teacher HQ, Classes, Reports).
 *
 * From 2200x1200 up the shell zooms by 4/3: a 2560x1440 TV lays out exactly
 * like the tuned 1920x1080 deck, only bigger, instead of 12px chrome floating
 * in a sea of art. CSS zoom also scales `dvh`, so the height is compensated
 * (75dvh x 4/3 = one full screen) and the page still never scrolls.
 *
 * Literal class strings only — Tailwind generates arbitrary values from
 * literals, never from composed ones.
 */
export const TEACHER_TV_SCALE =
  '[@media(min-width:2200px)_and_(min-height:1200px)]:[zoom:1.3333] [@media(min-width:2200px)_and_(min-height:1200px)]:h-[75dvh]';
