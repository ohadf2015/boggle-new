// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import Page, { generateMetadata } from '../page';
import { CANONICAL, JOIN_CODE_LENGTH, faqs } from '../seo';
import { JOIN_CODE_LENGTH as FORM_CODE_LENGTH } from '@/components/education/join/JoinCodeField';

describe('/en/lexiclash-join', () => {
  it('answers the "lexiclash join" search on /en only', async () => {
    const en = await generateMetadata({ params: Promise.resolve({ locale: 'en' }) });
    expect(String(en.title)).toContain('LexiClash Join');
    expect(en.robots).toEqual({ index: true, follow: true });
    expect(en.alternates?.canonical).toBe(CANONICAL);
    const he = await generateMetadata({ params: Promise.resolve({ locale: 'he' }) });
    expect(he.robots).toEqual({ index: false, follow: true });
    expect(he.alternates?.canonical).toBe(CANONICAL);
  });

  it('sends every ask to the one real join form, in the visitor locale', async () => {
    const html = renderToStaticMarkup(await Page({ params: Promise.resolve({ locale: 'en' }) }));
    expect(html.split('href="/en/join"').length - 1).toBeGreaterThanOrEqual(2);
    for (const f of faqs) expect(html).toContain(f.q);
  });

  it('holds no second code form (recurring pitfall class 3)', () => {
    const src = readFileSync(join(__dirname, '..', 'page.tsx'), 'utf8');
    expect(src).not.toMatch(/<input|<form|JoinFlow|JoinCodeStep/);
  });

  it('states the same code length the form accepts', () => {
    expect(JOIN_CODE_LENGTH).toBe(FORM_CODE_LENGTH);
  });
});
