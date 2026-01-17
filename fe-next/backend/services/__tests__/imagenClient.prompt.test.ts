/**
 * Tests for Imagen Client Prompt Generation
 * Ensures prompts enforce editorial style, prevent hex codes, and prevent kawaii/chibi aesthetics
 */

// We need to read the imagenClient.ts file to test the prompt text directly
import { readFileSync } from 'fs';
import { join } from 'path';

// Mock dependencies
jest.mock('google-auth-library');
jest.mock('sharp');
jest.mock('../../redisClient');
jest.mock('@supabase/supabase-js');

describe('Imagen Client - Prompt Quality', () => {
  let imagenClientSource: string;

  beforeAll(() => {
    // Read the source file to verify prompt constraints
    const imagenPath = join(__dirname, '../imagenClient.ts');
    imagenClientSource = readFileSync(imagenPath, 'utf-8');
  });

  beforeEach(() => {
    process.env.GOOGLE_CREDENTIALS_JSON = JSON.stringify({
      project_id: 'test-project',
      private_key: '-----BEGIN PRIVATE KEY-----\ntest-key\n-----END PRIVATE KEY-----',
      client_email: 'test@test.iam.gserviceaccount.com',
    });
  });

  describe('Anti-Hex-Code Constraints', () => {
    it('should explicitly prohibit hex color codes in ABSOLUTE CONSTRAINTS section', () => {
      // Find ABSOLUTE CONSTRAINTS section
      const constraintsMatch = imagenClientSource.match(
        /ABSOLUTE CONSTRAINTS[\s\S]*?STYLE ENFORCEMENT/
      );
      expect(constraintsMatch).toBeTruthy();

      const constraintsSection = constraintsMatch![0];

      // Verify hex code prohibition
      expect(constraintsSection).toContain('NO HEX COLOR CODES');
      expect(constraintsSection).toContain('#FFD700');
      expect(constraintsSection).toContain('#4285F4');
    });

    it('should explicitly prohibit RGB/HSL values in ABSOLUTE CONSTRAINTS section', () => {
      const constraintsMatch = imagenClientSource.match(
        /ABSOLUTE CONSTRAINTS[\s\S]*?STYLE ENFORCEMENT/
      );
      expect(constraintsMatch).toBeTruthy();

      const constraintsSection = constraintsMatch![0];

      // Verify RGB/HSL prohibition
      expect(constraintsSection).toContain('NO RGB/HSL values');
      expect(constraintsSection).toContain('rgb(255,215,0)');
    });

    it('should explicitly prohibit alphanumeric strings and technical notation', () => {
      const constraintsMatch = imagenClientSource.match(
        /ABSOLUTE CONSTRAINTS[\s\S]*?STYLE ENFORCEMENT/
      );
      expect(constraintsMatch).toBeTruthy();

      const constraintsSection = constraintsMatch![0];

      // Verify alphanumeric prohibition
      expect(constraintsSection).toContain('NO alphanumeric strings');
      expect(constraintsSection.toLowerCase()).toContain('no technical notation');
    });
  });

  describe('Anti-Kawaii Constraints', () => {
    it('should reject kawaii/chibi style explicitly in prompt', () => {
      const constraintsMatch = imagenClientSource.match(
        /ABSOLUTE CONSTRAINTS[\s\S]*?STYLE ENFORCEMENT/
      );
      expect(constraintsMatch).toBeTruthy();

      const constraintsSection = constraintsMatch![0];

      // Verify anti-chibi constraints
      expect(constraintsSection).toContain('NO chibi');
      expect(constraintsSection).toContain('NO super-deformed');
    });

    it('should enforce modern illustration style (not heavy anime)', () => {
      const constraintsMatch = imagenClientSource.match(
        /ABSOLUTE CONSTRAINTS[\s\S]*?STYLE ENFORCEMENT/
      );
      expect(constraintsMatch).toBeTruthy();

      const constraintsSection = constraintsMatch![0];

      // Verify anti-anime constraints
      expect(constraintsSection).toContain('NO heavy anime aesthetic');
      expect(constraintsSection).toContain('NO manga-style linework');
      expect(constraintsSection).toContain('NO moe');
    });
  });

  describe('Image Compression', () => {
    it('should use WebP quality 80 (not 90) for compression', () => {
      // Find postProcessImage function
      const postProcessMatch = imagenClientSource.match(
        /async function postProcessImage[\s\S]*?catch \(error/
      );
      expect(postProcessMatch).toBeTruthy();

      const postProcessFunction = postProcessMatch![0];

      // Verify quality 80 is used
      expect(postProcessFunction).toContain('quality: 80');
      expect(postProcessFunction).toContain('effort: 6');
    });

    it('should have file size check with 200KB target', () => {
      const postProcessMatch = imagenClientSource.match(
        /async function postProcessImage[\s\S]*?catch \(error/
      );
      expect(postProcessMatch).toBeTruthy();

      const postProcessFunction = postProcessMatch![0];

      // Verify 200KB target
      expect(postProcessFunction).toContain('fileSizeKB > 200');
      expect(postProcessFunction).toContain('target: <200KB');
    });

    it('should re-compress if exceeds 200KB', () => {
      const postProcessMatch = imagenClientSource.match(
        /async function postProcessImage[\s\S]*?catch \(error/
      );
      expect(postProcessMatch).toBeTruthy();

      const postProcessFunction = postProcessMatch![0];

      // Verify re-compression logic
      expect(postProcessFunction).toContain('applying additional compression');
      expect(postProcessFunction).toContain('targetQuality');
    });
  });

  describe('buildVisualScene Fallback', () => {
    it('should explicitly prevent chibi in default fallback case', () => {
      // Find buildVisualScene function
      const buildVisualMatch = imagenClientSource.match(
        /function buildVisualScene[\s\S]*?^}/m
      );
      expect(buildVisualMatch).toBeTruthy();

      const buildVisualFunction = buildVisualMatch![0];

      // Find the default return statement (fallback case)
      const fallbackMatch = buildVisualFunction.match(/return `MODERN 2\.5D.*?`/s);
      expect(fallbackMatch).toBeTruthy();

      const fallback = fallbackMatch![0];

      // Verify fallback explicitly mentions NO chibi/super-deformed
      expect(fallback).toContain('NO chibi');
      expect(fallback.toLowerCase()).toContain('super-deformed');
    });

    it('should reference modern illustration examples in fallback', () => {
      const buildVisualMatch = imagenClientSource.match(
        /function buildVisualScene[\s\S]*?^}/m
      );
      expect(buildVisualMatch).toBeTruthy();

      const buildVisualFunction = buildVisualMatch![0];
      const fallbackMatch = buildVisualFunction.match(/return `MODERN 2\.5D.*?`/s);
      expect(fallbackMatch).toBeTruthy();

      const fallback = fallbackMatch![0];

      // Verify modern app references
      expect(fallback).toContain('Headspace');
      expect(fallback).toContain('Duolingo');
    });
  });
});
