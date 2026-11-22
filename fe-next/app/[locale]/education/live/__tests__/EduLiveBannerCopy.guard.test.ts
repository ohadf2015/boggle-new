import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(resolve(__dirname, '../EduLivePageClient.tsx'), 'utf8');

describe('classroom live connection banner', () => {
  it('promises a safe score to students only, never to the teacher running the room', () => {
    expect(source).toMatch(/<ConnectionBanner showScoreSafe=\{!isTeacher\}/);
  });
});
