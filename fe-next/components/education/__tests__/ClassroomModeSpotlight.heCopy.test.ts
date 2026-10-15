import { describe, it, expect } from 'vitest';
import { he } from '@/translations/he.js';
import { catalogueEntry, catalogueKeys } from '../ClassroomModeCatalogueData';

type Dict = Record<string, unknown>;

function lookup(key: string): unknown {
  return key.split('.').reduce<unknown>((node, part) => (node as Dict | undefined)?.[part], he);
}

describe('Hebrew launch-screen copy for Vocab Quiz', () => {
  it('Given the vocab-quiz spotlight, When read in Hebrew, Then every line uses the playful copy', () => {
    const mode = catalogueEntry('vocab-quiz');
    expect(mode).toBeDefined();
    const keys = catalogueKeys(mode!);

    expect(lookup('academy.launch.subtitle')).toBe('בוחרים משחק, משתפים קוד וכולם מצטרפים!');
    expect(lookup(keys.category)).toBe('מכירים מילים');
    expect(keys.bestFor.map(lookup)).toEqual(['לומדים תוך כדי משחק', 'מתכוננים למבחן']);
    expect(lookup(keys.name)).toBe('חידון אוצר מילים');
    expect(lookup(keys.how)).toBe('ארבע אפשרויות, תשובה אחת נכונה. עונים מהר, צוברים נקודות ומגלים מי אלוף המילים!');
    expect(keys.steps.map(lookup)).toEqual([
      'מילה או הגדרה מופיעה על המסך הגדול.',
      'כל אחד בוחר בטלפון את התשובה הנכונה מתוך ארבע אפשרויות.',
      'עונים נכון ומהר כדי לצבור יותר נקודות. רצפים ותיבות בונוס מוסיפים לאתגר!',
    ]);
    expect(lookup('education.modePicker.launch')).toBe('מתחילים לשחק: {{mode}}');
  });
});
