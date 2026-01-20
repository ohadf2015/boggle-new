import {
  extractPlaceholders,
  validatePlaceholders,
  getValidationSummary,
  detectPlaceholderSyntax,
  isConsistentSyntax,
  type Placeholder,
  type ValidationResult,
} from './placeholderValidator';

describe('placeholderValidator', () => {
  describe('extractPlaceholders', () => {
    describe('{{name}} syntax', () => {
      it('should extract single placeholder with {{name}} syntax', () => {
        const template = 'Hello {{user}}, welcome!';
        const result = extractPlaceholders(template);
        expect(result).toEqual(['user']);
      });

      it('should extract multiple placeholders with {{name}} syntax', () => {
        const template = 'Hello {{user}}, you have {{count}} messages from {{sender}}.';
        const result = extractPlaceholders(template);
        expect(result).toEqual(['count', 'sender', 'user']); // Sorted alphabetically
      });

      it('should extract placeholders with underscores', () => {
        const template = 'Task: {{task_name}} - Priority: {{priority_level}}';
        const result = extractPlaceholders(template);
        expect(result).toEqual(['priority_level', 'task_name']);
      });

      it('should handle duplicate placeholders (returns unique)', () => {
        const template = '{{user}} said: {{message}}. {{user}} is online.';
        const result = extractPlaceholders(template);
        expect(result).toEqual(['message', 'user']);
      });
    });

    describe('{name} syntax', () => {
      it('should extract single placeholder with {name} syntax', () => {
        const template = 'Hello {user}, welcome!';
        const result = extractPlaceholders(template);
        expect(result).toEqual(['user']);
      });

      it('should extract multiple placeholders with {name} syntax', () => {
        const template = 'Hello {user}, you have {count} messages from {sender}.';
        const result = extractPlaceholders(template);
        expect(result).toEqual(['count', 'sender', 'user']);
      });
    });

    describe('$name syntax', () => {
      it('should extract single placeholder with $name syntax', () => {
        const template = 'Hello $user, welcome!';
        const result = extractPlaceholders(template);
        expect(result).toEqual(['user']);
      });

      it('should extract multiple placeholders with $name syntax', () => {
        const template = 'Hello $user, you have $count messages from $sender.';
        const result = extractPlaceholders(template);
        expect(result).toEqual(['count', 'sender', 'user']);
      });
    });

    describe('Mixed syntax', () => {
      it('should extract placeholders from mixed syntaxes', () => {
        const template = 'Hello {{user}}, you have {count} messages and $unread unread.';
        const result = extractPlaceholders(template);
        expect(result).toEqual(['count', 'unread', 'user']);
      });
    });

    describe('Edge cases', () => {
      it('should return empty array for template with no placeholders', () => {
        const template = 'This is a plain text template without any placeholders.';
        const result = extractPlaceholders(template);
        expect(result).toEqual([]);
      });

      it('should return empty array for empty string', () => {
        const template = '';
        const result = extractPlaceholders(template);
        expect(result).toEqual([]);
      });

      it('should ignore invalid placeholder names (starting with number)', () => {
        const template = 'Invalid: {{1user}}, valid: {{user1}}';
        const result = extractPlaceholders(template);
        expect(result).toEqual(['user1']);
      });

      it('should ignore malformed placeholders (spaces inside)', () => {
        const template = 'Bad: {{ user }}, good: {{user}}';
        const result = extractPlaceholders(template);
        expect(result).toEqual(['user']);
      });
    });
  });

  describe('validatePlaceholders', () => {
    describe('Valid templates', () => {
      it('should validate when all declared placeholders are used', () => {
        const template = 'Hello {{user}}, you have {{count}} messages.';
        const declared: Placeholder[] = [
          { name: 'user', description: 'User name' },
          { name: 'count', description: 'Message count' },
        ];

        const result = validatePlaceholders(template, declared);

        expect(result.isValid).toBe(true);
        expect(result.missingPlaceholders).toEqual([]);
        expect(result.unusedPlaceholders).toEqual([]);
        expect(result.errors).toEqual([]);
      });

      it('should validate with no placeholders declared and none used', () => {
        const template = 'This is a plain text template.';
        const declared: Placeholder[] = [];

        const result = validatePlaceholders(template, declared);

        expect(result.isValid).toBe(true);
        expect(result.missingPlaceholders).toEqual([]);
        expect(result.unusedPlaceholders).toEqual([]);
      });

      it('should validate with null placeholders array', () => {
        const template = 'This is a plain text template.';
        const result = validatePlaceholders(template, null);

        expect(result.isValid).toBe(true);
      });

      it('should validate with undefined placeholders array', () => {
        const template = 'This is a plain text template.';
        const result = validatePlaceholders(template, undefined);

        expect(result.isValid).toBe(true);
      });
    });

    describe('Missing placeholders', () => {
      it('should detect missing placeholders (declared but not used)', () => {
        const template = 'Hello {{user}}!';
        const declared: Placeholder[] = [
          { name: 'user', description: 'User name' },
          { name: 'count', description: 'Message count' },
        ];

        const result = validatePlaceholders(template, declared);

        expect(result.isValid).toBe(false);
        expect(result.missingPlaceholders).toEqual(['count']);
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0]).toContain('Missing placeholders');
        expect(result.errors[0]).toContain('count');
      });

      it('should detect multiple missing placeholders', () => {
        const template = 'Hello {{user}}!';
        const declared: Placeholder[] = [
          { name: 'user' },
          { name: 'count' },
          { name: 'sender' },
        ];

        const result = validatePlaceholders(template, declared);

        expect(result.isValid).toBe(false);
        expect(result.missingPlaceholders).toEqual(['count', 'sender']);
      });
    });

    describe('Unused placeholders', () => {
      it('should detect unused placeholders (used but not declared)', () => {
        const template = 'Hello {{user}}, you have {{count}} messages.';
        const declared: Placeholder[] = [
          { name: 'user', description: 'User name' },
        ];

        const result = validatePlaceholders(template, declared);

        expect(result.isValid).toBe(false);
        expect(result.unusedPlaceholders).toEqual(['count']);
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0]).toContain('Undeclared placeholders');
        expect(result.errors[0]).toContain('count');
      });

      it('should detect multiple unused placeholders', () => {
        const template = 'Hello {{user}}, you have {{count}} messages from {{sender}}.';
        const declared: Placeholder[] = [
          { name: 'user' },
        ];

        const result = validatePlaceholders(template, declared);

        expect(result.isValid).toBe(false);
        expect(result.unusedPlaceholders).toEqual(['count', 'sender']);
      });
    });

    describe('Both missing and unused', () => {
      it('should detect both missing and unused placeholders', () => {
        const template = 'Hello {{user}}, you have {{count}} messages.';
        const declared: Placeholder[] = [
          { name: 'user' },
          { name: 'sender' }, // Missing (declared but not used)
        ];

        const result = validatePlaceholders(template, declared);

        expect(result.isValid).toBe(false);
        expect(result.missingPlaceholders).toEqual(['sender']);
        expect(result.unusedPlaceholders).toEqual(['count']);
        expect(result.errors).toHaveLength(2);
      });
    });

    describe('Edge cases', () => {
      it('should reject empty template content', () => {
        const declared: Placeholder[] = [
          { name: 'user' },
        ];

        const result = validatePlaceholders('', declared);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Template content is empty');
      });

      it('should reject whitespace-only template', () => {
        const declared: Placeholder[] = [
          { name: 'user' },
        ];

        const result = validatePlaceholders('   \n\t  ', declared);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Template content is empty');
      });
    });
  });

  describe('getValidationSummary', () => {
    it('should return success message for valid result', () => {
      const result: ValidationResult = {
        isValid: true,
        missingPlaceholders: [],
        unusedPlaceholders: [],
        errors: [],
      };

      const summary = getValidationSummary(result);
      expect(summary).toBe('All placeholders valid ✓');
    });

    it('should summarize missing placeholders', () => {
      const result: ValidationResult = {
        isValid: false,
        missingPlaceholders: ['count', 'sender'],
        unusedPlaceholders: [],
        errors: ['Missing placeholders in template: count, sender'],
      };

      const summary = getValidationSummary(result);
      expect(summary).toBe('Missing: count, sender');
    });

    it('should summarize unused placeholders', () => {
      const result: ValidationResult = {
        isValid: false,
        missingPlaceholders: [],
        unusedPlaceholders: ['extra', 'unknown'],
        errors: ['Undeclared placeholders used in template: extra, unknown'],
      };

      const summary = getValidationSummary(result);
      expect(summary).toBe('Undeclared: extra, unknown');
    });

    it('should summarize both missing and unused', () => {
      const result: ValidationResult = {
        isValid: false,
        missingPlaceholders: ['count'],
        unusedPlaceholders: ['extra'],
        errors: [
          'Missing placeholders in template: count',
          'Undeclared placeholders used in template: extra',
        ],
      };

      const summary = getValidationSummary(result);
      expect(summary).toBe('Missing: count | Undeclared: extra');
    });
  });

  describe('detectPlaceholderSyntax', () => {
    it('should detect {{name}} syntax', () => {
      const template = 'Hello {{user}}, welcome!';
      const syntax = detectPlaceholderSyntax(template);
      expect(syntax).toBe('{{name}}');
    });

    it('should detect {name} syntax', () => {
      const template = 'Hello {user}, welcome!';
      const syntax = detectPlaceholderSyntax(template);
      expect(syntax).toBe('{name}');
    });

    it('should detect $name syntax', () => {
      const template = 'Hello $user, welcome!';
      const syntax = detectPlaceholderSyntax(template);
      expect(syntax).toBe('$name');
    });

    it('should return null for no placeholders', () => {
      const template = 'Hello user, welcome!';
      const syntax = detectPlaceholderSyntax(template);
      expect(syntax).toBeNull();
    });

    it('should prioritize {{name}} syntax if mixed', () => {
      const template = 'Hello {{user}}, you have {count} messages.';
      const syntax = detectPlaceholderSyntax(template);
      expect(syntax).toBe('{{name}}');
    });
  });

  describe('isConsistentSyntax', () => {
    it('should return true for single syntax: {{name}}', () => {
      const template = 'Hello {{user}}, you have {{count}} messages.';
      const result = isConsistentSyntax(template);
      expect(result).toBe(true);
    });

    it('should return true for single syntax: {name}', () => {
      const template = 'Hello {user}, you have {count} messages.';
      const result = isConsistentSyntax(template);
      expect(result).toBe(true);
    });

    it('should return true for single syntax: $name', () => {
      const template = 'Hello $user, you have $count messages.';
      const result = isConsistentSyntax(template);
      expect(result).toBe(true);
    });

    it('should return true for no placeholders', () => {
      const template = 'Hello user, welcome!';
      const result = isConsistentSyntax(template);
      expect(result).toBe(true);
    });

    it('should return false for mixed {{name}} and {name}', () => {
      const template = 'Hello {{user}}, you have {count} messages.';
      const result = isConsistentSyntax(template);
      expect(result).toBe(false);
    });

    it('should return false for mixed {{name}} and $name', () => {
      const template = 'Hello {{user}}, you have $count messages.';
      const result = isConsistentSyntax(template);
      expect(result).toBe(false);
    });

    it('should return false for all three syntaxes', () => {
      const template = 'Hello {{user}}, you have {count} messages and $unread unread.';
      const result = isConsistentSyntax(template);
      expect(result).toBe(false);
    });
  });
});
