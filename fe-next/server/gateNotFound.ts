import type { Response } from 'express';

// Static 404 for URLs the Next handle() gate drops (see lib/seo/nextHandleGate.ts).
// An empty 404 with `X-Content-Type-Options: nosniff` and no Content-Type makes
// Chrome download a blank file instead of showing a page, so a mistyped
// lexiclash.live link looked broken. This stays a plain string so the gate
// still never SSRs the locale layout (the memory-leak reason it exists).
export const GATE_NOT_FOUND_HTML = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>Page not found | LexiClash</title>
<style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#0f172a;color:#f8fafc;text-align:center;padding:24px}a{display:inline-block;margin-top:16px;padding:12px 20px;border-radius:12px;background:#22d3ee;color:#0f172a;font-weight:700;text-decoration:none}</style>
</head><body><main><h1>Page not found</h1><p>This page doesn't exist on LexiClash.</p><a href="/">Go to LexiClash</a></main></body></html>`;

export function sendGateNotFound(res: Response, method?: string): void {
  res.status(404);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=300');
  if (method === 'HEAD') {
    res.end();
    return;
  }
  res.end(GATE_NOT_FOUND_HTML);
}
