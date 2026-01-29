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

  describe('Prompt Constraints', () => {
    it('should have a CONSTRAINTS section in the prompt', () => {
      // Find CONSTRAINTS section
      const constraintsMatch = imagenClientSource.match(/CONSTRAINTS:[\s\S]*?MOOD:/);
      expect(constraintsMatch).toBeTruthy();
    });

    it('should prohibit hex codes and technical notation', () => {
      const constraintsMatch = imagenClientSource.match(/CONSTRAINTS:[\s\S]*?MOOD:/);
      expect(constraintsMatch).toBeTruthy();

      const constraintsSection = constraintsMatch![0];
      expect(constraintsSection.toLowerCase()).toContain('no hex codes');
      expect(constraintsSection.toLowerCase()).toContain('technical notation');
    });

    it('should prohibit chibi/anime style', () => {
      const constraintsMatch = imagenClientSource.match(/CONSTRAINTS:[\s\S]*?MOOD:/);
      expect(constraintsMatch).toBeTruthy();

      const constraintsSection = constraintsMatch![0];
      expect(constraintsSection.toLowerCase()).toContain('no chibi');
      expect(constraintsSection.toLowerCase()).toContain('anime');
    });

    it('should enforce family-friendly content', () => {
      const constraintsMatch = imagenClientSource.match(/CONSTRAINTS:[\s\S]*?MOOD:/);
      expect(constraintsMatch).toBeTruthy();

      const constraintsSection = constraintsMatch![0];
      expect(constraintsSection.toLowerCase()).toContain('family-friendly');
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

  describe('Prompt Style', () => {
    it('should have a STYLE section defining the illustration style', () => {
      const styleMatch = imagenClientSource.match(/STYLE:[\s\S]*?TOPIC:/);
      expect(styleMatch).toBeTruthy();

      const styleSection = styleMatch![0];
      expect(styleSection.toLowerCase()).toContain('caricature');
      expect(styleSection.toLowerCase()).toContain('illustration');
    });

    it('should mention modern 2.5D illustration style', () => {
      const styleMatch = imagenClientSource.match(/STYLE:[\s\S]*?TOPIC:/);
      expect(styleMatch).toBeTruthy();

      const styleSection = styleMatch![0];
      expect(styleSection).toContain('2.5D');
    });

    it('should include trending arrow in the scene', () => {
      const styleMatch = imagenClientSource.match(/STYLE:[\s\S]*?TOPIC:/);
      expect(styleMatch).toBeTruthy();

      const styleSection = styleMatch![0];
      expect(styleSection.toLowerCase()).toContain('trending arrow');
    });
  });

  describe('Language Handling in Prompt', () => {
    it('should NOT list languages NOT to use (negative list)', () => {
      // Find the buildImagePrompt function
      const buildPromptMatch = imagenClientSource.match(
        /function buildImagePrompt[\s\S]*?^}/m
      );
      expect(buildPromptMatch).toBeTruthy();

      const buildPromptFunction = buildPromptMatch![0];

      // Should NOT say "NO Hebrew text", "NO Japanese text", etc.
      // The prompt should only specify the language TO use, not list languages NOT to use
      expect(buildPromptFunction).not.toContain('NO Hebrew text');
      expect(buildPromptFunction).not.toContain('NO Japanese text');
      expect(buildPromptFunction).not.toContain('NO Swedish text');
      expect(buildPromptFunction).not.toContain('NO Spanish text');
    });

    it('should have language mapping for supported languages', () => {
      const buildPromptMatch = imagenClientSource.match(
        /function buildImagePrompt[\s\S]*?^}/m
      );
      expect(buildPromptMatch).toBeTruthy();

      const buildPromptFunction = buildPromptMatch![0];

      // Should have language mappings
      expect(buildPromptFunction).toContain("en: 'English'");
      expect(buildPromptFunction).toContain("he: 'Hebrew'");
      expect(buildPromptFunction).toContain("sv: 'Swedish'");
      expect(buildPromptFunction).toContain("ja: 'Japanese'");
    });

    it('should include LANGUAGE section in prompt template', () => {
      const languageMatch = imagenClientSource.match(/LANGUAGE:[\s\S]*?CONSTRAINTS:/);
      expect(languageMatch).toBeTruthy();

      const languageSection = languageMatch![0];
      expect(languageSection).toContain('MUST be in');
    });
  });
});
