export type PluralForms = Partial<Record<Intl.LDMLPluralRule, string>> & { other: string };

function pluralCategory(count: number, locale: string): Intl.LDMLPluralRule {
  try {
    return new Intl.PluralRules(locale).select(count);
  } catch {
    return new Intl.PluralRules('en').select(count);
  }
}

/** The translation key for `count` in `locale`; a category without its own key uses `other`. */
export function pluralKey(forms: PluralForms, count: number, locale: string): string {
  return forms[pluralCategory(count, locale)] ?? forms.other;
}
