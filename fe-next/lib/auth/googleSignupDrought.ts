const USERS_PER_PAGE = 200;
const MAX_PAGES = 10;

interface AuthUserRow {
  created_at: string;
  is_anonymous?: boolean;
  app_metadata?: { providers?: unknown };
}

export interface AuthUserLister {
  auth: {
    admin: {
      listUsers(params: { page: number; perPage: number }): PromiseLike<{
        data: { users: AuthUserRow[] } | null;
        error: { message: string } | null;
      }>;
    };
  };
}

export interface GoogleSignupDroughtInput {
  /** New non-anonymous Google accounts in the window. */
  googleSignups: number;
  /** Landing CTA clicks in the same window, or games started when those cannot be read. */
  arrivals: number;
  /** Hours of the window that fall in local daytime (08:00–24:00). */
  daytimeHours: number;
}

export function shouldAlertGoogleSignupDrought(input: GoogleSignupDroughtInput): boolean {
  return input.daytimeHours >= 8 && input.googleSignups === 0 && input.arrivals > 10;
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

/** Auth lists newest accounts first, so paging stops at the first account older than the window. */
export async function countGoogleSignupsSince(
  client: AuthUserLister,
  since: string,
  perPage = USERS_PER_PAGE,
): Promise<number> {
  const sinceMs = Date.parse(since);
  let count = 0;
  for (let page = 1; page <= MAX_PAGES; page++) {
    const { data, error } = await client.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(error.message);
    const users = data?.users ?? [];
    for (const user of users) {
      const providers = user.app_metadata?.providers;
      if (
        Date.parse(user.created_at) >= sinceMs
        && !user.is_anonymous
        && Array.isArray(providers)
        && providers.includes('google')
      ) count += 1;
    }
    const oldest = users[users.length - 1];
    if (users.length < perPage || !oldest || Date.parse(oldest.created_at) < sinceMs) return count;
  }
  throw new Error('Google signup window exceeds the page cap');
}
