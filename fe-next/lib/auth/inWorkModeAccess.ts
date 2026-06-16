/**
 * In-work mode access — the single chokepoint deciding who may see/play game
 * modes that are still being readied for everyone.
 *
 * Historically these modes were gated on `is_admin` alone. They are now visible
 * to **admins OR beta testers**. Routing every gate (client display, route
 * guards, server-component guards, the socket start gate) through this one pure
 * predicate means adding a future in-work mode never requires remembering to
 * "also allow beta" — wire the new gate to this and beta access comes for free.
 *
 * Fails closed: a null/undefined profile or missing flags → false.
 */
export interface InWorkModeProfile {
  is_admin?: boolean | null;
  is_beta_tester?: boolean | null;
}

export function canAccessInWorkMode(profile: InWorkModeProfile | null | undefined): boolean {
  return !!(profile && (profile.is_admin || profile.is_beta_tester));
}
