import { resolveJoinCodeVerdict } from '@/lib/education/joinCodeVerdict';

// Students type the class code into the multiplayer box; a dead "room" there is often a live class.
export async function classJoinPathForDeadCode(code: string, language: string): Promise<string | null> {
  const verdict = await resolveJoinCodeVerdict(code);
  if (verdict !== 'classroom' && verdict !== 'game' && verdict !== 'ended') return null;
  return `/${language}/join/${code.trim().toUpperCase()}`;
}
