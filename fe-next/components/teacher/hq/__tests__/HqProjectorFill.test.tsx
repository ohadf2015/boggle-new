import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '../../../..');
const read = (rel: string) => readFileSync(path.join(ROOT, rel), 'utf8');

describe('projector-size HQ surfaces', () => {
  it('Given the launch hand-off, Then its card grows to fill a projector', () => {
    expect(read('components/teacher/hq/HqLaunchStage.tsx')).toMatch(/max-w-md[^"]*2xl:max-w-xl|2xl:max-w-xl/);
  });
});
