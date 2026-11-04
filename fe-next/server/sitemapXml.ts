import type { NextFunction, Request, Response } from 'express';

type SitemapEntry = {
  url: string;
  lastModified?: string | Date;
  changeFrequency?: string;
  priority?: number;
  alternates?: { languages?: Record<string, string> };
};

/** Same bytes the Express /sitemap.xml route has always sent. */
export function buildSitemapXml(routes: SitemapEntry[]): string {
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n';
  for (const route of routes) {
    xml += '  <url>\n';
    xml += `    <loc>${route.url}</loc>\n`;
    if (route.lastModified) xml += `    <lastmod>${route.lastModified}</lastmod>\n`;
    if (route.changeFrequency) xml += `    <changefreq>${route.changeFrequency}</changefreq>\n`;
    if (route.priority) xml += `    <priority>${route.priority}</priority>\n`;
    if (route.alternates?.languages) {
      for (const [lang, url] of Object.entries(route.alternates.languages)) {
        xml += `    <xhtml:link rel="alternate" hreflang="${lang}" href="${url}" />\n`;
      }
    }
    xml += '  </url>\n';
  }
  xml += '</urlset>';
  return xml;
}

/** Exact GET /sitemap.xml. Registered before the catch-all gate so a dotted
 *  nested path (/sitemap.xml/<page>) cannot be served as this document. */
export async function sitemapXmlHandler(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const sitemapModule = await import('../app/sitemap');
    const xml = buildSitemapXml(sitemapModule.default());
    res.setHeader('Content-Type', 'application/xml');
    res.send(xml);
  } catch (err) {
    const { httpLogger } = await import('./logger');
    httpLogger.error({ err }, 'Failed to generate sitemap.xml');
    next(err);
  }
}
