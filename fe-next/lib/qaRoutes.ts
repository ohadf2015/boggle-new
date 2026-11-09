const QA_SEGMENTS = new Set(['avatar-test', 'comeback-test', 'ai-fanfare-demo']);

export type QaRouteEnv = { NODE_ENV?: string; ENABLE_QA_ROUTES?: string };

export function qaRoutesEnabled(env: QaRouteEnv = process.env): boolean {
  return env.NODE_ENV !== 'production' || env.ENABLE_QA_ROUTES === '1';
}

/** Dev-only design previews under a real section. Their page calls notFound() in prod, which streams under loading.tsx and answers 200. */
const QA_PREVIEW_PATHS = new Set(['teacher/preview', 'student/achievements/preview', 'student/play/preview']);

export function isHiddenQaRoute(pathname: string, env: QaRouteEnv = process.env): boolean {
  if (qaRoutesEnabled(env)) return false;
  const segments = pathname.split('/').filter(Boolean).slice(1);
  if (QA_SEGMENTS.has(segments[0] ?? '')) return true;
  return QA_PREVIEW_PATHS.has(segments.join('/'));
}
