import type { Request, Response } from 'express';
import { parse as parseUrl } from 'url';
import { noteNextHandleDrop } from '../backend/modules/nextHandleStats';
import { decideNextHandle } from '../lib/seo/nextHandleGate';
import { sendGateNotFound } from './gateNotFound';

/**
 * Prod pre-Next gate (server/index.ts catch-all, before handle()).
 * Returns true when the response is finished — caller must not call Next.
 * Path-only Location so crawlers see /en/<page>, not another host.
 */
export function finishNextHandleGate(req: Request, res: Response): boolean {
  const parsedUrl = parseUrl(req.url, true);
  const pathname = parsedUrl.pathname ?? '';
  const ua = req.headers['user-agent'];
  const userAgent = Array.isArray(ua) ? ua[0] : ua;
  const gate = decideNextHandle(pathname, userAgent);
  if (gate.action === 'drop') {
    noteNextHandleDrop(gate.reason);
    sendGateNotFound(res, req.method);
    return true;
  }
  if (gate.action === 'redirect') {
    const search = parsedUrl.search || '';
    res.status(308);
    res.setHeader('Location', `${gate.location}${search}`);
    res.end();
    return true;
  }
  return false;
}
