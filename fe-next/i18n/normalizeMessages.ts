/**
 * Normalize legacy translation template variables to ICU MessageFormat.
 *
 * The existing translation files use three interpolation syntaxes:
 *   - ${var}   (JS template literal style)
 *   - {{var}}  (i18next / Handlebars style)
 *   - {var}    (ICU MessageFormat — already correct)
 *
 * next-intl uses ICU MessageFormat which only supports {var}.
 * This function recursively walks the messages object and normalizes
 * all string values so next-intl can handle interpolation natively.
 */

function normalizeString(value: string): string {
  // ${var} → {var}
  let result = value.replace(/\$\{(\w+)\}/g, '{$1}');
  // {{var}} → {var}
  result = result.replace(/\{\{(\w+)\}\}/g, '{$1}');
  return result;
}

export function normalizeMessages(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const key of Object.keys(obj)) {
    const value = obj[key];
    if (typeof value === 'string') {
      result[key] = normalizeString(value);
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      result[key] = normalizeMessages(value as Record<string, unknown>);
    } else {
      result[key] = value;
    }
  }

  return result;
}
