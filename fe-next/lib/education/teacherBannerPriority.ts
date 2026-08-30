/**
 * Which single banner sits above the teacher dashboard.
 *
 * The page used to render a trial countdown, a district-pricing upsell and a
 * Pro upgrade strip all at once, before the dashboard the teacher came for.
 * Across 35 approved teachers this product has 4 classrooms and 1 student —
 * pitching district pricing to someone who has never run a game is noise in
 * front of the one thing they came to do.
 *
 * District pricing is not dropped, it moves to where it is relevant: the
 * classroom-game launcher already carries a "LexiClash for schools" link.
 */
export type TeacherBanner = 'trial' | 'pro' | 'none';

export function pickTeacherBanner({
  hasTrial,
  isAdmin,
}: {
  hasTrial: boolean;
  isAdmin: boolean;
}): TeacherBanner {
  if (hasTrial) return 'trial';
  if (isAdmin) return 'none';
  return 'pro';
}
