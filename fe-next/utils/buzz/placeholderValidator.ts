/**
 * Placeholder Validator for Buzz Prompt Templates
 *
 * Validates that template_content uses all declared placeholders correctly.
 * Supports multiple placeholder syntaxes: {{name}}, {name}, $name
 */

export interface Placeholder {
  name: string;
  description?: string;
}

export interface ValidationResult {
  isValid: boolean;
  missingPlaceholders: string[]; // Declared but not used in template
  unusedPlaceholders: string[];  // Used in template but not declared
  errors: string[];
}

/**
 * Supported placeholder syntaxes
 * Order matters: check {{name}} first to avoid matching inner {name}
 */
const PLACEHOLDER_PATTERNS = [
  /\{\{([a-zA-Z_][a-zA-Z0-9_]*)\}\}/g,          // {{placeholder}}
  /(?<!\{)\{([a-zA-Z_][a-zA-Z0-9_]*)\}(?!\})/g, // {placeholder} but not {{placeholder}}
  /\$([a-zA-Z_][a-zA-Z0-9_]*)/g,                // $placeholder
];

/**
 * Extract all placeholder names from template content
 * Supports multiple syntaxes: {{name}}, {name}, $name
 *
 * @param templateContent - Template text with placeholders
 * @returns Array of unique placeholder names found
 */
export function extractPlaceholders(templateContent: string): string[] {
  const placeholders = new Set<string>();

  for (const pattern of PLACEHOLDER_PATTERNS) {
    const matches = templateContent.matchAll(pattern);
    for (const match of matches) {
      if (match[1]) {
        placeholders.add(match[1]);
      }
    }
  }

  return Array.from(placeholders).sort();
}

/**
 * Validate template content against declared placeholders
 *
 * @param templateContent - Template text with placeholders
 * @param declaredPlaceholders - Array of placeholders that should be used
 * @returns Validation result with missing/unused placeholders
 */
export function validatePlaceholders(
  templateContent: string,
  declaredPlaceholders: Placeholder[] | null | undefined
): ValidationResult {
  const errors: string[] = [];

  // Handle empty template
  if (!templateContent || templateContent.trim() === '') {
    errors.push('Template content is empty');
    return {
      isValid: false,
      missingPlaceholders: [],
      unusedPlaceholders: [],
      errors,
    };
  }

  // Extract placeholders from template
  const usedPlaceholders = extractPlaceholders(templateContent);
  const declaredNames = (declaredPlaceholders || []).map(p => p.name);

  // Find missing placeholders (declared but not used)
  const missingPlaceholders = declaredNames.filter(
    name => !usedPlaceholders.includes(name)
  );

  // Find unused placeholders (used but not declared)
  const unusedPlaceholders = usedPlaceholders.filter(
    name => !declaredNames.includes(name)
  );

  // Build error messages
  if (missingPlaceholders.length > 0) {
    errors.push(
      `Missing placeholders in template: ${missingPlaceholders.join(', ')}`
    );
  }

  if (unusedPlaceholders.length > 0) {
    errors.push(
      `Undeclared placeholders used in template: ${unusedPlaceholders.join(', ')}`
    );
  }

  const isValid = errors.length === 0;

  return {
    isValid,
    missingPlaceholders,
    unusedPlaceholders,
    errors,
  };
}

/**
 * Get a user-friendly summary of validation results
 *
 * @param result - Validation result from validatePlaceholders
 * @returns Human-readable summary string
 */
export function getValidationSummary(result: ValidationResult): string {
  if (result.isValid) {
    return 'All placeholders valid ✓';
  }

  const parts: string[] = [];

  if (result.missingPlaceholders.length > 0) {
    parts.push(
      `Missing: ${result.missingPlaceholders.join(', ')}`
    );
  }

  if (result.unusedPlaceholders.length > 0) {
    parts.push(
      `Undeclared: ${result.unusedPlaceholders.join(', ')}`
    );
  }

  return parts.join(' | ');
}

/**
 * Detect which placeholder syntax is used in template
 *
 * @param templateContent - Template text
 * @returns Detected syntax or null if none found
 */
export function detectPlaceholderSyntax(
  templateContent: string
): '{{name}}' | '{name}' | '$name' | null {
  // Check {{name}} first
  if (/\{\{[a-zA-Z_][a-zA-Z0-9_]*\}\}/.test(templateContent)) {
    return '{{name}}';
  }
  // Check {name} but exclude {{name}}
  if (/(?<!\{)\{[a-zA-Z_][a-zA-Z0-9_]*\}(?!\})/.test(templateContent)) {
    return '{name}';
  }
  // Check $name
  if (/\$[a-zA-Z_][a-zA-Z0-9_]*/.test(templateContent)) {
    return '$name';
  }
  return null;
}

/**
 * Check if template uses consistent placeholder syntax
 *
 * @param templateContent - Template text
 * @returns true if consistent, false if mixed syntaxes
 */
export function isConsistentSyntax(templateContent: string): boolean {
  const usedSyntaxes = [];

  // Check for {{name}} syntax
  if (/\{\{[a-zA-Z_][a-zA-Z0-9_]*\}\}/.test(templateContent)) {
    usedSyntaxes.push('{{name}}');
  }

  // Check for {name} syntax (but not {{name}})
  // Use negative lookbehind/lookahead to exclude {{name}}
  if (/(?<!\{)\{[a-zA-Z_][a-zA-Z0-9_]*\}(?!\})/.test(templateContent)) {
    usedSyntaxes.push('{name}');
  }

  // Check for $name syntax
  if (/\$[a-zA-Z_][a-zA-Z0-9_]*/.test(templateContent)) {
    usedSyntaxes.push('$name');
  }

  return usedSyntaxes.length <= 1;
}
