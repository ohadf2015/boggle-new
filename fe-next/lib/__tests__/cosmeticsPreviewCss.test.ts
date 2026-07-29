import { readFileSync } from 'fs';
import { join } from 'path';
import { COSMETICS } from '../cosmetics';

const cssPath = join(__dirname, '../../app/cosmetics.css');

describe('cosmetics.css — preview class coverage', () => {
  let cssContent: string;

  beforeAll(() => {
    cssContent = readFileSync(cssPath, 'utf-8');
  });

  it('exists and is non-empty', () => {
    expect(cssContent.length).toBeGreaterThan(0);
  });

  it.each(COSMETICS.map((c) => [c.id, c.preview]))(
    'cosmetic %s has preview class .%s defined in cosmetics.css',
    (_id, preview) => {
      expect(cssContent).toContain(`.${preview}`);
    }
  );
});
