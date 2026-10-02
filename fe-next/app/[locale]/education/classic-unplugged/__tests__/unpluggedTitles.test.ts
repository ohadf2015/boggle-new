import { describe, it, expect } from 'vitest';
import { generateMetadata as classic } from '../page';
import { generateMetadata as teamTiles } from '../../team-tiles-unplugged/page';
import { generateMetadata as reteach } from '../../unplugged-reteach/page';

const props = (query: Record<string, string>, locale = 'en') => ({
  params: Promise.resolve({ locale }),
  searchParams: Promise.resolve(query),
});

describe('unplugged projector pages always have a tab title', () => {
  it.each([
    ['classic-unplugged', classic],
    ['team-tiles-unplugged', teamTiles],
    ['unplugged-reteach', reteach],
  ])('%s opened bare gets a non-empty, translated title', async (_route, generate) => {
    const meta = await generate(props({}));
    expect(typeof meta.title).toBe('string');
    expect((meta.title as string).trim().length).toBeGreaterThan(0);
    expect(meta.title as string).not.toMatch(/eg2Fix\./);
  });

  it('includes the lesson when the share link names one', async () => {
    const meta = await classic(props({ lesson: 'Physics 101' }));
    expect(meta.title as string).toContain('Physics 101');
  });

  it('uses the page locale (he)', async () => {
    const meta = await reteach(props({}, 'he'));
    expect(meta.title as string).toMatch(/[֐-׿]/);
  });
});
