export type BlastTranslate = (key: string, vars?: Record<string, string | number>) => string;
/** The app `t`: an English fallback and/or interpolation vars. */
export type BlastResultsT = (
  key: string,
  fallbackOrVars?: string | Record<string, string | number>,
  vars?: Record<string, string | number>,
) => string;
