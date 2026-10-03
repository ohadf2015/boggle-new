import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const src = readFileSync(join(__dirname, '..', 'AssignmentCreator.tsx'), 'utf8');

describe('AssignmentCreator fits a 1440x900 screen', () => {
  it('pins the create/cancel row to the bottom of the scrolling dialog so it is never below the fold', () => {
    const actions = src.match(/data-testid="assignment-actions"[^>]*className="([^"]+)"/);
    expect(actions?.[1]).toMatch(/\bsticky\b/);
    expect(actions?.[1]).toMatch(/(^|\s)-bottom-6(\s|$)/);
    expect(actions?.[1]).toMatch(/\bbg-neo-navy\b/);
  });

  it('keeps the optional instructions field short', () => {
    expect(src).toMatch(/<textarea[\s\S]*?rows=\{2\}/);
  });
});
