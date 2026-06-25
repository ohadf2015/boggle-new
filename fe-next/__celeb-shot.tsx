/* Throwaway visual-QA: render every celebrity bot avatar to a labeled contact sheet PNG. */
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { chromium } from 'playwright';
import AvatarRendererSsr from '@/components/avatar/AvatarRendererSsr';
import { CELEBRITY_BOTS } from '@/backend/modules/botCelebrities';

const cards = CELEBRITY_BOTS.map((c) => {
  const svg = renderToStaticMarkup(
    React.createElement(AvatarRendererSsr, { config: c.customAvatar, size: 160, circular: true })
  );
  return `<div class="card"><div class="av">${svg}</div><div class="lbl">${c.emoji} ${c.name} Bot</div></div>`;
}).join('');

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
  body{margin:0;background:#1a1a2e;font-family:system-ui,sans-serif;padding:24px}
  h1{color:#BFFF00;font-size:22px;margin:0 0 18px}
  .grid{display:grid;grid-template-columns:repeat(5,1fr);gap:18px}
  .card{background:#16213e;border:3px solid #000;border-radius:12px;padding:12px;box-shadow:4px 4px 0 #000;display:flex;flex-direction:column;align-items:center;gap:8px}
  .av{width:160px;height:160px}
  .lbl{color:#FFFEF0;font-weight:700;font-size:14px;text-align:center}
</style></head><body>
  <h1>Celebrity &amp; Politician Bots — ${CELEBRITY_BOTS.length} lookalikes</h1>
  <div class="grid">${cards}</div>
</body></html>`;

const out = '/private/tmp/claude-501/-Users-ohadfisher-git-boggle-new/89159922-ef56-4e29-8392-92fe48c56046/scratchpad/celebs2.png';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 980, height: 200 }, deviceScaleFactor: 2 });
  await page.setContent(html, { waitUntil: 'networkidle' });
  await page.screenshot({ path: out, fullPage: true });
  await browser.close();
  console.log('wrote', out);
})();
