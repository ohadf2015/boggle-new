export interface AccessApprovalResult {
  paidDay0: boolean;
  alreadyApproved: boolean;
}

export interface AccessApproval extends AccessApprovalResult {
  /** Settles once the profile re-read sees the teacher role, so the next page's gate admits her. */
  ready: Promise<void>;
}

export function accessHandoffHref(language: string, approval: AccessApprovalResult, returnTo: string | null): string {
  if (approval.alreadyApproved) return returnTo ?? `/${language}/teacher`;
  if (approval.paidDay0) return `/${language}/teacher/class-ready`;
  return returnTo ?? `/${language}/teacher/classroom/new`;
}

const REFRESH_CAP_MS = 4000;

/** The next page's gate re-reads a stale profile itself, so a stuck refresh must not hold the teacher here. */
export function profileReady(refreshProfile: (() => Promise<unknown>) | undefined): Promise<void> {
  return Promise.race([
    Promise.resolve()
      .then(() => refreshProfile?.())
      .then(
        () => undefined,
        () => undefined,
      ),
    new Promise<void>((resolve) => setTimeout(resolve, REFRESH_CAP_MS)),
  ]);
}
