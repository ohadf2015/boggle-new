import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const dir = 'components/student/academy';
const files = readdirSync(join(process.cwd(), dir)).filter((f) => f.endsWith('.tsx'));

describe('the hub keeps the main thread free while it idles', () => {
  it.each(files)('%s runs no endless framer loop (useCompositorLoop or a CSS animation instead)', (file) => {
    const src = readFileSync(join(process.cwd(), dir, file), 'utf8');
    expect(src).not.toMatch(/repeat:\s*Infinity/);
  });
});
