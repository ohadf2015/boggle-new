/**
 * Silent-signup guard (t_de3e790a).
 * Google is ~90% of LexiClash signups. If daytime traffic is clicking the
 * landing CTA and nobody completes Google, the sign-in path is broken even
 * when pageviews look healthy.
 */
export interface GoogleSignupDroughtInput {
  /** Google provider signups (new + returning) in the window. */
  googleSignups: number;
  /** growth:landing_cta_clicked events in the same window. */
  landingCtaClicked: number;
  /** Hours of the window that fall in local daytime (08:00–24:00). */
  daytimeHours: number;
}

export function shouldAlertGoogleSignupDrought(input: GoogleSignupDroughtInput): boolean {
  return input.daytimeHours >= 8 && input.googleSignups === 0 && input.landingCtaClicked > 10;
}

/** Hours in the lookback whose local time is 08:00–23:59. Night hours do not count. */
export function daytimeHoursEndingAt(now: Date, hours: number, timeZone = 'Asia/Jerusalem'): number {
  let daytime = 0;
  for (let i = 0; i < hours; i++) {
    const t = new Date(now.getTime() - i * 3_600_000);
    const hour = Number(new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour: 'numeric',
      hourCycle: 'h23',
    }).format(t));
    if (hour >= 8) daytime += 1;
  }
  return daytime;
}
