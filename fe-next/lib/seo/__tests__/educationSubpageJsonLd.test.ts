import { describe, it, expect } from 'vitest';
import {
  buildEducationDuelsJsonLd,
  buildEducationClassroomJsonLd,
  getEducationSubpageContent,
} from '../educationSubpageJsonLd';

describe('educationSubpageJsonLd', () => {
  describe('buildEducationDuelsJsonLd', () => {
    it('returns HowTo + LearningResource + BreadcrumbList for /education/duels', () => {
      const { howTo, resource, breadcrumb } = buildEducationDuelsJsonLd('en');
      expect(howTo['@type']).toBe('HowTo');
      expect(howTo['@id']).toBe('https://www.lexiclash.live/en/education/duels#howto');
      expect(howTo.step).toHaveLength(3);
      expect(resource['@type']).toBe('LearningResource');
      expect(resource.learningResourceType).toBe('Game');
      expect(resource.educationalUse).toContain('Vocabulary Building');
      expect(resource.isAccessibleForFree).toBe(true);
      expect(breadcrumb['@type']).toBe('BreadcrumbList');
      expect(breadcrumb.itemListElement).toHaveLength(3);
    });

    it('falls back to en when locale is unknown', () => {
      const { howTo } = buildEducationDuelsJsonLd('zz');
      expect(howTo.inLanguage).toBe('en');
      expect(howTo.name).toContain('Vocabulary Duel');
    });

    it('uses Hebrew strings for he locale', () => {
      const { howTo, resource } = buildEducationDuelsJsonLd('he');
      expect(howTo.inLanguage).toBe('he');
      expect(howTo.name).toMatch(/דואל/);
      expect(resource.inLanguage).toBe('he');
    });

    it('encodes provider linkage to EducationalOrganization @id', () => {
      const { resource } = buildEducationDuelsJsonLd('en');
      expect(resource.provider['@id']).toBe('https://www.lexiclash.live/en/education#org');
      expect(resource.provider['@type']).toBe('EducationalOrganization');
    });
  });

  describe('buildEducationClassroomJsonLd', () => {
    it('returns Activity learningResourceType for whole-class mode', () => {
      const { resource } = buildEducationClassroomJsonLd('en');
      expect(resource.learningResourceType).toBe('Activity');
      expect(resource.educationalUse).toContain('Whole-Class Activity');
    });

    it('breadcrumb includes Classroom Game leaf', () => {
      const { breadcrumb } = buildEducationClassroomJsonLd('en');
      const leaf = breadcrumb.itemListElement[2];
      expect(leaf.name).toBe('Classroom Game');
      expect(leaf.item).toBe('https://www.lexiclash.live/en/education/classroom-game');
    });

    it('renders distinct content per locale (he, sv, ja, es)', () => {
      const locales = ['he', 'sv', 'ja', 'es'] as const;
      const names = locales.map((l) => buildEducationClassroomJsonLd(l).howTo.name);
      // No duplicates — each locale has its own translated name
      expect(new Set(names).size).toBe(locales.length);
    });
  });

  describe('getEducationSubpageContent', () => {
    it('returns 3 steps for both keys in en', () => {
      expect(getEducationSubpageContent('duels', 'en').steps).toHaveLength(3);
      expect(getEducationSubpageContent('classroomGame', 'en').steps).toHaveLength(3);
    });

    it('content shape stable across all 5 supported locales', () => {
      const locales = ['en', 'he', 'sv', 'ja', 'es'] as const;
      for (const l of locales) {
        const c = getEducationSubpageContent('duels', l);
        expect(c.name).toBeTruthy();
        expect(c.description).toBeTruthy();
        expect(c.steps).toHaveLength(3);
        expect(c.educationalUse.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Russian (ru) locale support', () => {
    it('buildEducationDuelsJsonLd supports ru locale with Russian strings', () => {
      const { howTo, resource, breadcrumb } = buildEducationDuelsJsonLd('ru');
      expect(howTo.inLanguage).toBe('ru');
      expect(howTo['@id']).toBe('https://www.lexiclash.live/ru/education/duels#howto');
      expect(typeof howTo.name).toBe('string');
      expect(howTo.name.length).toBeGreaterThan(0);
      expect(resource.inLanguage).toBe('ru');
      expect(breadcrumb.itemListElement[0].item).toBe('https://www.lexiclash.live/ru');
      expect(breadcrumb.itemListElement[1].item).toBe('https://www.lexiclash.live/ru/education');
      expect(breadcrumb.itemListElement[2].item).toBe('https://www.lexiclash.live/ru/education/duels');
    });

    it('buildEducationClassroomJsonLd supports ru locale with Russian strings', () => {
      const { howTo, resource, breadcrumb } = buildEducationClassroomJsonLd('ru');
      expect(howTo.inLanguage).toBe('ru');
      expect(resource.inLanguage).toBe('ru');
      expect(breadcrumb.itemListElement[2].item).toBe('https://www.lexiclash.live/ru/education/classroom-game');
      expect(typeof howTo.name).toBe('string');
      expect(howTo.name.length).toBeGreaterThan(0);
    });

    it('getEducationSubpageContent returns ru strings for both subpage keys', () => {
      const duels = getEducationSubpageContent('duels', 'ru');
      const classroom = getEducationSubpageContent('classroomGame', 'ru');
      expect(duels.name).toBeTruthy();
      expect(duels.steps).toHaveLength(3);
      expect(classroom.name).toBeTruthy();
      expect(classroom.steps).toHaveLength(3);
    });
  });
});
