/**
 * Google Play "Designed for Families" compliance — avatar mouths must not
 * depict tobacco/smoking or blood. Guards against regressions that would
 * re-introduce policy-violating imagery.
 */
import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MOUTH_PARTS } from '@/components/avatar/parts/MouthParts';
import { customAvatarSchema } from '@/shared/types/customAvatar';

const markup = (key: keyof typeof MOUTH_PARTS) => {
  const Part = MOUTH_PARTS[key];
  return renderToStaticMarkup(
    <svg viewBox="0 0 100 100">
      <Part />
    </svg>,
  );
};

describe('MouthParts — family-safe content', () => {
  it('the legacy "pipe" mouth no longer depicts tobacco (no pipe/ember/smoke)', () => {
    const html = markup('pipe').toLowerCase();
    // tobacco pipe brown, lit ember orange/gold, grey smoke
    expect(html).not.toContain('8b4513'); // pipe wood
    expect(html).not.toContain('ff4500'); // lit ember
    expect(html).not.toContain('ffd700'); // ember glow
    // smoke clouds were grey #ddd circles rising above the mouth
    expect(html).not.toMatch(/#ddd\b/);
  });

  it('a saved avatar with mouth "pipe" still validates (back-compat)', () => {
    const base = {
      gender: 'male', base: 'round', skinColor: '#E0AC69', hair: 'spiky',
      hairColor: '#000000', eyes: 'round', eyeColor: '#4A6FA5', noseStyle: 'button',
      eyebrows: 'none', facialHair: 'none', mouth: 'pipe', accessory: 'none',
      accessoryColor: '#000000', bgColor: '#1a1a2e', shirtColor: '#4A6FA5',
    };
    expect(() => customAvatarSchema.parse(base)).not.toThrow();
  });

  it('the "vampire" mouth has fangs but no blood', () => {
    const html = markup('vampire').toLowerCase();
    expect(html).not.toContain('cc0000'); // blood red
    expect(html).not.toContain('ff4444'); // blood highlight
    // still a mouth (renders some path)
    expect(html).toContain('<path');
  });
});
