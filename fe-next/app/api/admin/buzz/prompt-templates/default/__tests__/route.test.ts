/**
 * Tests for GET /api/admin/buzz/prompt-templates/default
 *
 * This endpoint returns the default template content for a given template type,
 * enabling the admin UI to pre-populate the template editor.
 */

import fs from 'fs';
import path from 'path';

describe('Default Template API Route - Structure', () => {
  const routePath = path.join(__dirname, '../route.ts');
  let routeContent: string;

  beforeAll(() => {
    routeContent = fs.readFileSync(routePath, 'utf-8');
  });

  it('should export a GET handler', () => {
    expect(routeContent).toContain('export async function GET');
  });

  it('should verify admin authentication', () => {
    expect(routeContent).toContain('verifyAdminAuth');
  });

  it('should require type parameter', () => {
    // Should validate that 'type' parameter is provided
    expect(routeContent).toContain("'type'");
    expect(routeContent).toContain('Missing required parameter');
  });

  it('should return success response with template data', () => {
    expect(routeContent).toContain('success: true');
    expect(routeContent).toContain('templateType');
    expect(routeContent).toContain('content');
    expect(routeContent).toContain('fromDatabase');
  });

  it('should support section-based template types', () => {
    expect(routeContent).toContain('SECTION_TO_TEMPLATE_TYPE');
    expect(routeContent).toContain('PROMPT_SECTIONS');
  });

  it('should support legacy template types', () => {
    expect(routeContent).toContain('LEGACY_DEFAULT_TEMPLATES');
    // Object keys in TypeScript are unquoted
    expect(routeContent).toContain('riddle:');
    expect(routeContent).toContain('image:');
    expect(routeContent).toContain('challenge_general:');
    expect(routeContent).toContain('social_content:');
  });

  it('should handle invalid template type', () => {
    expect(routeContent).toContain('Invalid template type');
    expect(routeContent).toContain('status: 400');
  });
});

describe('Legacy Template Defaults', () => {
  const routePath = path.join(__dirname, '../route.ts');
  let routeContent: string;

  beforeAll(() => {
    routeContent = fs.readFileSync(routePath, 'utf-8');
  });

  it('should have riddle template with placeholder variables', () => {
    expect(routeContent).toContain('{topic}');
    expect(routeContent).toContain('{language}');
    expect(routeContent).toContain('{difficulty}');
  });

  it('should have image template with style guidelines', () => {
    expect(routeContent).toContain('neo-brutalist');
    expect(routeContent).toContain('200KB');
  });

  it('should have challenge_general template with challenge types', () => {
    expect(routeContent).toContain('anagram');
    expect(routeContent).toContain('word_chain');
    expect(routeContent).toContain('riddle');
  });

  it('should have social_content template with platforms', () => {
    expect(routeContent).toContain('X (Twitter)');
    expect(routeContent).toContain('Instagram');
    expect(routeContent).toContain('TikTok');
  });
});
