import { describe, it, expect } from 'vitest';
import {
  educationOrganizationJsonLd,
  educationCourseJsonLd,
} from '../educationStructuredData';

// Regression guard: these builders historically used the WRONG domain
// (https://lexiclash.com) which is NOT the canonical site (www.lexiclash.live).
// Two domains for one org fragments the entity graph for AI/search engines.
describe('educationStructuredData — canonical domain', () => {
  it('educationOrganizationJsonLd uses the canonical www.lexiclash.live domain', () => {
    const schema = educationOrganizationJsonLd('en');
    expect(schema.url).toBe('https://www.lexiclash.live/en/education');
    expect(schema.url).not.toContain('lexiclash.com');
  });

  it('educationOrganizationJsonLd carries the same @id as the server-rendered org', () => {
    // Must match buildEducationOrgJsonLd so both emissions resolve to one entity.
    expect(educationOrganizationJsonLd('en')['@id']).toBe(
      'https://www.lexiclash.live/en/education#org',
    );
  });

  it('educationOrganizationJsonLd sameAs links real profiles, never lexiclash.com', () => {
    const schema = educationOrganizationJsonLd('en');
    expect(schema.sameAs).toContain('https://www.instagram.com/lexi.clash');
    expect(schema.sameAs.every((u: string) => !u.includes('lexiclash.com'))).toBe(true);
  });

  it('educationCourseJsonLd provider url uses the canonical domain', () => {
    const schema = educationCourseJsonLd({
      name: 'Test',
      description: 'Test course',
      url: 'https://www.lexiclash.live/en/education/esl-word-games',
      locale: 'en',
    });
    expect(schema.provider.url).toBe('https://www.lexiclash.live');
    expect(schema.provider.url).not.toContain('lexiclash.com');
  });
});
