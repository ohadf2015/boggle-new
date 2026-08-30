/**
 * What COPY CODE puts on a teacher's clipboard.
 *
 * The button used to copy the bare six characters. Teachers paste that into
 * WhatsApp or Google Classroom, so the student received "C7ESL5" and nothing
 * else — and the only page that accepts it, /[locale]/join/[code], is not
 * guessable. The bare domain has no code box at all. Carry the destination.
 */
export function classroomInvitePayload(
  origin: string,
  language: string,
  code: string
): string {
  if (!origin) return code;
  return `${code}\n${origin}/${language}/join/${code}`;
}
