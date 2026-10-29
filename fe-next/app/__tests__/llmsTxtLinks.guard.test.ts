import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, it, expect } from 'vitest';

// llmstxt.org: AI tools follow `- [name](url)` links; a bare URL in prose is
// not a link they can use. The public audit flagged /llms.txt for listing 106
// plain-text URLs (Growth Radar rec 12872).
describe('public/llms.txt links', () => {
  const txt = readFileSync(join(__dirname, '..', '..', 'public', 'llms.txt'), 'utf8');
  const lines = txt.split('\n');

  it('opens with an H1 title and a > summary line', () => {
    expect(lines[0]).toMatch(/^# \S/);
    expect(lines.find((l) => l.trim() !== '' && !l.startsWith('#'))).toMatch(/^> \S/);
  });

  it('writes every real URL as a markdown link', () => {
    const bare = lines.filter(
      // A URL template (…/YYYY-MM-DD) is documentation, not a page to follow.
      (l) => /(^|[^(])https:\/\//.test(l) && !/https:\/\/\S*YYYY/.test(l),
    );
    expect(bare).toEqual([]);
  });

  it('links the key pages', () => {
    const links = txt.match(/\]\(https:\/\/www\.lexiclash\.live[^)]*\)/g) ?? [];
    expect(links.length).toBeGreaterThanOrEqual(50);
  });
});
