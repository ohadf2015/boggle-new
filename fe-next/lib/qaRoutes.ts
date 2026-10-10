const QA_SEGMENTS = new Set(['avatar-test', 'comeback-test', 'ai-fanfare-demo']);

export type QaRouteEnv = { NODE_ENV?: string; ENABLE_QA_ROUTES?: string };

export function qaRoutesEnabled(env: QaRouteEnv = process.env): boolean {
  return env.NODE_ENV !== 'production' || env.ENABLE_QA_ROUTES === '1';
}

export function isHiddenQaRoute(pathname: string, env: QaRouteEnv = process.env): boolean {
  if (qaRoutesEnabled(env)) return false;
  return QA_SEGMENTS.has(pathname.split('/')[2] ?? '');
}
