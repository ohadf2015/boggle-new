import { describe, it, expect } from 'vitest';
import { extractCompoundTitlesFromPage } from '../wiktionaryParser';

const pageXml = (title: string, body: string): string => `
<page>
  <title>${title}</title>
  <ns>0</ns>
  <revision>
    <text xml:space="preserve">${body}</text>
  </revision>
</page>`;

describe('extractCompoundTitlesFromPage', () => {
  it('returns title when page is in target category', () => {
    const xml = pageXml('בית ספר', '== עברית ==\nהגדרה\n[[קטגוריה:צירופים]]');
    const out = extractCompoundTitlesFromPage(xml, ['צירופים']);
    expect(out).toEqual(['בית ספר']);
  });

  it('returns empty when page lacks target category', () => {
    const xml = pageXml('בית', '== עברית ==\n[[קטגוריה:שמות עצם]]');
    const out = extractCompoundTitlesFromPage(xml, ['צירופים']);
    expect(out).toEqual([]);
  });

  it('matches any of multiple target categories', () => {
    const xml = pageXml('יום הולדת', '[[קטגוריה:ביטויים]]');
    const out = extractCompoundTitlesFromPage(xml, ['צירופים', 'ביטויים']);
    expect(out).toEqual(['יום הולדת']);
  });

  it('filters out non-main namespace pages', () => {
    const xml = `
<page>
  <title>Template:Foo</title>
  <ns>10</ns>
  <revision><text>[[קטגוריה:צירופים]]</text></revision>
</page>`;
    const out = extractCompoundTitlesFromPage(xml, ['צירופים']);
    expect(out).toEqual([]);
  });

  it('requires titles to contain a space (compound, not single word)', () => {
    const xml = pageXml('ספר', '[[קטגוריה:צירופים]]');
    const out = extractCompoundTitlesFromPage(xml, ['צירופים']);
    expect(out).toEqual([]);
  });
});
