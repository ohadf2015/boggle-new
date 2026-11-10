import type { Request, Response } from 'express';
import { seoContent } from '../app/[locale]/(home)/seoContent';

const ORIGIN = 'https://www.lexiclash.live';

const LOCALE_LINKS: Array<[string, string]> = [
  ['English', 'en'],
  ['עברית', 'he'],
  ['Svenska', 'sv'],
  ['日本語', 'ja'],
  ['Español', 'es'],
  ['Русский', 'ru'],
];

export function prefersMarkdown(accept: string | undefined): boolean {
  if (!accept) return false;
  let markdownQ = 0;
  let htmlQ = 0;
  for (const part of accept.split(',')) {
    const [type, ...params] = part.trim().toLowerCase().split(';');
    const qParam = params.map((p) => p.trim()).find((p) => p.startsWith('q='));
    const q = qParam ? Number(qParam.slice(2)) : 1;
    if (Number.isNaN(q)) continue;
    if (type === 'text/markdown') markdownQ = Math.max(markdownQ, q);
    else if (type === 'text/html') htmlQ = Math.max(htmlQ, q);
  }
  return markdownQ > 0 && markdownQ >= htmlQ;
}

export function renderHomeMarkdown(): string {
  const { title, description, features, faq } = seoContent.en;
  return [
    `# ${title}`,
    '',
    description,
    '',
    `Play now: ${ORIGIN}/en`,
    '',
    '## Features',
    '',
    ...features.map((f) => `- ${f}`),
    '',
    '## Frequently asked questions',
    '',
    ...faq.flatMap(({ question, answer }) => [`### ${question}`, '', answer, '']),
    '## Languages',
    '',
    ...LOCALE_LINKS.map(([name, code]) => `- [${name}](${ORIGIN}/${code})`),
    '',
    `More for crawlers and agents: [llms.txt](${ORIGIN}/llms.txt), [llms-full.txt](${ORIGIN}/llms-full.txt), [sitemap](${ORIGIN}/sitemap.xml)`,
    '',
  ].join('\n');
}

export function handleHomeMarkdown(req: Request, res: Response, pathname: string | null): boolean {
  if (pathname !== '/' && pathname !== '/en') return false;
  res.vary('Accept');
  if (req.headers.host?.toLowerCase() === 'lexiclash.live') return false;
  if (!prefersMarkdown(req.headers.accept)) return false;
  res
    .status(200)
    .type('text/markdown; charset=utf-8')
    .setHeader('Cache-Control', 'public, max-age=300');
  res.send(renderHomeMarkdown());
  return true;
}
