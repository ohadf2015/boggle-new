/**
 * Pure grouping for the admin live-monitor "Connections by page" view.
 *
 * The live card shows a raw Socket.IO connection count (io.sockets.sockets.size)
 * that is otherwise opaque: an admin sees "13 connections" with no idea what
 * those sockets are doing. Each connected client reports its current route over
 * the socket (see the `pageView` event), which the server stashes on
 * socket.data.page. This function turns those per-socket pages into a per-page
 * breakdown so the connection number becomes explainable.
 *
 * Sockets that never reported a page (just-connected, or non-web clients such as
 * native webviews / embeds that don't run the reporter) are bucketed under
 * `unknown` — surfacing them is the point, not hiding them.
 *
 * No React, no side effects — safe to unit test and to call on the server.
 */

import { normalizePagePath } from '../../presence/normalizePagePath';

export interface ConnectionPageGroup {
  /** Normalized page path, or UNKNOWN_CONNECTION_PAGE for unreported sockets. */
  path: string;
  count: number;
}

/** Bucket label for sockets that have not reported a page. */
export const UNKNOWN_CONNECTION_PAGE = 'unknown';

export function summarizeConnectionsByPage(
  pages: Array<string | null | undefined>
): ConnectionPageGroup[] {
  const counts = new Map<string, number>();

  for (const raw of pages) {
    // Falsy (null/undefined/'') = socket never reported a page → unknown bucket.
    const path = raw ? normalizePagePath(raw) : UNKNOWN_CONNECTION_PAGE;
    counts.set(path, (counts.get(path) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([path, count]) => ({ path, count }))
    .sort((a, b) => b.count - a.count);
}
