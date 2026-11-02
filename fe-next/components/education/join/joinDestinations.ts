export function joinClassHref(locale: string): string {
  return `/${locale}/student?class=open`;
}

export function joinNewCodeHref(locale: string): string {
  return `/${locale}/join`;
}

/** Today's practice round for a student whose class game already ended: the daily Word Hunt, solo, no account needed. */
export function latePracticeHref(locale: string): string {
  return `/${locale}/daily/word-hunt?from=late_join`;
}
