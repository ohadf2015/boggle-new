interface NameProfile {
  display_name?: string | null;
  username?: string | null;
}

/** The name a Word Bridge daily submit carries: the profile's, else the guest's own pick, else the plain fallback. */
export function dailySubmitName({
  profile,
  chosenGuestName,
  fallback,
}: {
  profile: NameProfile | null | undefined;
  chosenGuestName: string | null;
  fallback: string;
}): string {
  return profile?.display_name || profile?.username || chosenGuestName || fallback;
}
