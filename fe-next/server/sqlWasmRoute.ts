/**
 * Serve sql.js for the daily Word Hunt offline validator.
 *
 * The browser fetches /sql/sql-wasm.wasm. public/sql/ is gitignored and
 * copied at image build, but decideNextHandle used to 404 the path before
 * Next could serve it (`sql` was not a known public dir). This route is
 * registered before that gate and sets application/wasm explicitly.
 */
import { existsSync } from 'node:fs';
import path from 'node:path';
import type { Application, Request, Response } from 'express';

export const SQL_WASM_ROUTE = '/sql/sql-wasm.wasm';

export function resolveSqlWasmPath(root?: string): string | null {
  const roots = root
    ? [root]
    : [process.cwd(), path.resolve(__dirname, '..')];
  const candidates = roots.flatMap((r) => [
    path.join(r, 'public', 'sql', 'sql-wasm.wasm'),
    path.join(r, 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm'),
  ]);
  return candidates.find((p) => existsSync(p)) ?? null;
}

export function registerSqlWasmRoute(app: Application, root?: string): void {
  app.get(SQL_WASM_ROUTE, (_req: Request, res: Response) => {
    const file = resolveSqlWasmPath(root);
    if (!file) {
      res.status(404).type('text/plain').send('sql-wasm.wasm missing');
      return;
    }
    res.type('application/wasm');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    // send() defaults to dotfiles:'ignore', which 404s a path that merely
    // passes through a dot directory (the test temp dir, and `.next`).
    res.sendFile(file, { dotfiles: 'allow' }, (err) => {
      if (err && !res.headersSent) {
        res.status(404).type('text/plain').send('sql-wasm.wasm missing');
      }
    });
  });
}
