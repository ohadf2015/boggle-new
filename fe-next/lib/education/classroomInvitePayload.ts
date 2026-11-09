/**
 * What COPY CODE puts on a teacher's clipboard.
 *
 * The button used to copy the bare six characters. Teachers paste that into
 * WhatsApp or Google Classroom, so the student received "C7ESL5" and nothing
 * else — and the only page that accepts it, /[locale]/join/[code], is not
 * guessable. The bare domain has no code box at all. Carry the destination.
 */
const SITE_LOCALES = ['en', 'he', 'sv', 'ja', 'es', 'ru'];

/** Students land in the class's language; the teacher's UI language is only the fallback. */
export function inviteLocale(classLanguage: string | null | undefined, uiLanguage: string): string {
  return classLanguage && SITE_LOCALES.includes(classLanguage) ? classLanguage : uiLanguage;
}

/** The page a student opens to join this classroom's roster. */
export function classroomJoinUrl(origin: string, language: string, code: string): string {
  const base = origin.replace(/\/$/, '');
  return `${base}/${language}/join/${code}`;
}

/**
 * A join address as people read and type it: no scheme, no `www.` (the bare host
 * redirects), no trailing slash. Every screen and slip that prints an address uses
 * this, so the projector, the share sheet and the printed slip all say the same thing.
 */
export function joinAddressForDisplay(url: string): string {
  return url.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '');
}

export function classroomInvitePayload(
  origin: string,
  language: string,
  code: string
): string {
  if (!origin) return code;
  return `${code}\n${classroomJoinUrl(origin, language, code)}`;
}
