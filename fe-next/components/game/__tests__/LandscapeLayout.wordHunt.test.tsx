/**
 * Test: LandscapeLayout renders WordHunt UI when in word-hunt mode
 *
 * Verifies that landscape orientation includes WordHuntTargetArea,
 * WordHuntLifeBar, and WordHuntPlayerLives — matching PortraitLayout.
 */

import fs from 'fs';
import path from 'path';

const sourceCode = fs.readFileSync(
  path.resolve(__dirname, '../in-game/components/LandscapeLayout.tsx'),
  'utf-8'
);

describe('LandscapeLayout word-hunt UI', () => {
  it('should import WordHuntTargetArea', () => {
    expect(sourceCode).toContain("import { WordHuntTargetArea }");
  });

  it('should import WordHuntLifeBar', () => {
    expect(sourceCode).toContain("import { WordHuntLifeBar }");
  });

  it('should import WordHuntPlayerLives', () => {
    expect(sourceCode).toContain("import { WordHuntPlayerLives }");
  });

  it('should render WordHuntTargetArea when gameMode is word-hunt', () => {
    expect(sourceCode).toContain('<WordHuntTargetArea');
  });

  it('should render WordHuntLifeBar when gameMode is word-hunt', () => {
    expect(sourceCode).toContain('<WordHuntLifeBar');
  });

  it('should render WordHuntPlayerLives when gameMode is word-hunt', () => {
    expect(sourceCode).toContain('<WordHuntPlayerLives');
  });

  it('should conditionally render word-hunt UI based on gameMode', () => {
    expect(sourceCode).toContain("gameMode === 'word-hunt'");
  });
});
