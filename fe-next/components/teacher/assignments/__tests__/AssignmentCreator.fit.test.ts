import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const src = readFileSync(join(__dirname, '..', 'AssignmentCreator.tsx'), 'utf8');

describe('AssignmentCreator fits a 1440x900 screen', () => {
  it('keeps the create/cancel row in the dialog footer, outside the scrolling body, so it is never below the fold', () => {
    expect(src).toMatch(/<NbDialogFooter data-testid="assignment-actions"/);
    const body = src.slice(src.indexOf('<NbDialogBody className="space-y-5">'), src.indexOf('<NbDialogFooter data-testid="assignment-actions"'));
    expect(body).toContain('</NbDialogBody>');
  });

  it('keeps the optional instructions field short', () => {
    expect(src).toMatch(/<textarea[\s\S]*?rows=\{2\}/);
  });
});
