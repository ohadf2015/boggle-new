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
 *
 * A Pro teacher (paid or gifted) never sees the upgrade strip: "Upgrade to Pro"
 * above a Pro dashboard reads as "your Pro did not take". While the entitlement
 * is still loading we show nothing rather than an upsell a later answer retracts
 * (recurring pitfall class 1).
 */
export type TeacherBanner = 'trial' | 'pro' | 'reactivate' | 'trialing' | 'none';

export function pickTeacherBanner({
  hasTrial,
  isAdmin,
  hasPro = false,
  proLoading = false,
  hasMilestone = true,
  milestoneLoading = false,
  proAskDismissed = false,
  polarTrialExpired = false,
  polarTrialing = false,
}: {
  hasTrial: boolean;
  isAdmin: boolean;
  hasPro?: boolean;
  proLoading?: boolean;
  /** A classroom has actually engaged (see teacherProMilestone). Default true
   *  so callers that only know entitlement keep the old "free → ask" path. */
  hasMilestone?: boolean;
  milestoneLoading?: boolean;
  proAskDismissed?: boolean;
  /**
   * Polar Teacher Pro trial ended and they are not Pro. One reactivation
   * ask — it replaces the access-trial banner and the milestone Pro strip
   * so the dashboard never stacks three Pro asks.
   */
  polarTrialExpired?: boolean;
  /**
   * Live Polar Teacher Pro trial (hasPro + trialing). One days-remaining
   * banner with a paid checkout CTA — not the access-trial countdown.
   */
  polarTrialing?: boolean;
}): TeacherBanner {
  // Pro is checked FIRST, and so is "Pro has not answered yet". A gifted-Pro
  // teacher keeps the trial deadline she was granted Pro to replace; checking
  // `hasTrial` first put a trial countdown over a Pro dashboard, and turned it
  // into an "Upgrade to Pro" card the day that dead deadline passed.
  // A live Polar trial is still Pro, but conversion needs the lifecycle banner
  // (days left + Keep Pro CTA). Paid/gifted Pro stays quiet. An expired Polar
  // trial is the single reactivation ask below.
  if (proLoading) return 'none';
  if (hasPro && polarTrialing) return 'trialing';
  if (hasPro) return 'none';
  if (polarTrialExpired) return 'reactivate';
  if (hasTrial) return 'trial';
  if (isAdmin) return 'none';
  // The Pro strip is a milestone ask, not a first-visit billboard. Hide it
  // until engagement is known and real, and stay quiet after a dismiss.
  if (milestoneLoading || !hasMilestone || proAskDismissed) return 'none';
  return 'pro';
}
