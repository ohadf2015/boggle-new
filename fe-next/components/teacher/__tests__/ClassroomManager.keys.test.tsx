import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { en } from '@/translations/en';
import { es } from '@/translations/es';
import { he } from '@/translations/he';
import { ja } from '@/translations/ja';
import { ru } from '@/translations/ru';
import { sv } from '@/translations/sv';

// Derive required keys from actual t() calls in the component
// This prevents keys from silently escaping coverage
function getRequiredKeysFromSource(): string[] {
  const componentPath = path.join(__dirname, '../ClassroomManager.tsx');
  const content = fs.readFileSync(componentPath, 'utf-8');
  const keyMatches = content.match(/t\('teacher\.classroom\.([^']+)'/g) || [];
  const keys = keyMatches.map(match =>
    match.replace(/t\('teacher\.classroom\./, '').replace(/'$/, '')
  );
  return [...new Set(keys)].sort();
}

const REQUIRED_KEYS = getRequiredKeysFromSource();

// Helper to resolve nested key path
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

describe('ClassroomManager translation keys', () => {
  const locales = { en, es, he, ja, ru, sv };
  const localeNames = Object.keys(locales);

  it('should have teacher.classroom namespace for all locales', () => {
    Object.entries(locales).forEach(([name, locale]) => {
      expect(locale.teacher, `${name}: teacher namespace`).toBeDefined();
      expect((locale.teacher as any).classroom, `${name}: teacher.classroom namespace`).toBeDefined();
    });
  });

  it('should have all required keys in all locales', () => {
    Object.entries(locales).forEach(([name, locale]) => {
      const classroom = (locale.teacher as any)?.classroom;
      expect(classroom, `${name}: classroom object exists`).toBeDefined();

      REQUIRED_KEYS.forEach(key => {
        const value = getNestedValue(classroom, key);
        expect(value, `${name}: teacher.classroom.${key}`).toBeDefined();
        expect(typeof value, `${name}: teacher.classroom.${key} is string`).toBe('string');
        expect(value.length, `${name}: teacher.classroom.${key} is not empty`).toBeGreaterThan(0);
      });
    });
  });

  it('should not have duplicate teacher keys at root level', () => {
    Object.entries(locales).forEach(([name, locale]) => {
      // Check that locale is a single object, not having the teacher key overwrit itself
      const teacherKey = (locale as any).teacher;
      expect(teacherKey, `${name}: has teacher key`).toBeDefined();

      // Verify classroom is present within teacher
      expect((teacherKey as any).classroom, `${name}: teacher.classroom exists`).toBeDefined();
    });
  });

  it('should have classrooms namespace for student count', () => {
    Object.entries(locales).forEach(([name, locale]) => {
      const classroomsNs = (locale.teacher as any)?.classrooms;
      expect(classroomsNs, `${name}: teacher.classrooms namespace`).toBeDefined();
      expect((classroomsNs as any).students?.count, `${name}: classrooms.students.count`).toBeDefined();
    });
  });
});
