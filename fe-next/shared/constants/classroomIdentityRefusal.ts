export const CLASSROOM_IDENTITY_REFUSALS = {
  AUTH_REQUIRED: 'education.errors.signInRequired',
  AUTH_UNVERIFIED: 'education.errors.signInCheckFailed',
} as const;

export type ClassroomIdentityRefusalCode = keyof typeof CLASSROOM_IDENTITY_REFUSALS;

export function isClassroomIdentityRefusal(data: unknown): data is { code: ClassroomIdentityRefusalCode; error: string } {
  const code = (data as { code?: unknown } | null)?.code;
  return typeof data === 'object' && typeof code === 'string' && code in CLASSROOM_IDENTITY_REFUSALS;
}
