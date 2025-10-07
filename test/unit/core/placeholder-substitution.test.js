/**
 * Placeholder Substitution tests
 */

const PlaceholderSubstitution = require('../../../src/core/placeholder-substitution');

describe('PlaceholderSubstitution', () => {
  let substitution;

  beforeEach(() => {
    substitution = new PlaceholderSubstitution();
  });

  describe('Constructor', () => {
    test('should create instance with default options', () => {
      expect(substitution).toBeInstanceOf(PlaceholderSubstitution);
      expect(substitution.options.strictMode).toBe(false);
      expect(substitution.options.preserveUnmatched).toBe(true);
      expect(substitution.options.logMissingData).toBe(true);
      expect(substitution.options.deleteEmptyElements).toBe(true);
    });

    test('should initialize stats', () => {
      expect(substitution.stats.totalSubstitutions).toBe(0);
      expect(substitution.stats.successfulSubstitutions).toBe(0);
      expect(substitution.stats.failedSubstitutions).toBe(0);
      expect(substitution.stats.deletedElements).toBe(0);
    });
  });

  describe('getDataValue', () => {
    test('should get simple property values', () => {
      const data = { name: 'John', age: 30 };

      expect(substitution.getDataValue(data, 'name')).toBe('John');
      expect(substitution.getDataValue(data, 'age')).toBe(30);
      expect(substitution.getDataValue(data, 'missing')).toBeNull();
    });

    test('should get nested property values', () => {
      const data = {
        user: {
          name: 'John',
          contact: {
            email: 'john@example.com',
            phone: '123-456-7890',
          },
        },
      };

      expect(substitution.getDataValue(data, 'user.name')).toBe('John');
      expect(substitution.getDataValue(data, 'user.contact.email')).toBe('john@example.com');
      expect(substitution.getDataValue(data, 'user.contact.phone')).toBe('123-456-7890');
      expect(substitution.getDataValue(data, 'user.missing.property')).toBeNull();
    });

    test('should handle edge cases', () => {
      expect(substitution.getDataValue(null, 'property')).toBeNull();
      expect(substitution.getDataValue({}, null)).toBeNull();
      expect(substitution.getDataValue({}, '')).toBeNull();
    });
  });

  describe('isEmptyValue', () => {
    test('should identify empty values correctly', () => {
      expect(substitution.isEmptyValue(null)).toBe(true);
      expect(substitution.isEmptyValue(undefined)).toBe(true);
      expect(substitution.isEmptyValue('')).toBe(true);
      expect(substitution.isEmptyValue('   ')).toBe(true);
      expect(substitution.isEmptyValue([])).toBe(true);
      expect(substitution.isEmptyValue({})).toBe(true);
    });

    test('should identify non-empty values correctly', () => {
      expect(substitution.isEmptyValue('text')).toBe(false);
      expect(substitution.isEmptyValue(0)).toBe(false);
      expect(substitution.isEmptyValue(false)).toBe(false);
      expect(substitution.isEmptyValue([1, 2, 3])).toBe(false);
      expect(substitution.isEmptyValue({ key: 'value' })).toBe(false);
    });
  });

  describe('replaceInContent', () => {
    test('should replace content at specific position', () => {
      const content = 'Hello (((name))), welcome!';
      // '(((name)))' has length 10, from index 6 to 16 (exclusive)
      const result = substitution.replaceInContent(content, 6, 10, 'John');

      expect(result).toBe('Hello John, welcome!');
    });

    test('should handle replacement at beginning', () => {
      const content = '(((greeting))) world!';
      const result = substitution.replaceInContent(content, 0, 14, 'Hello');

      expect(result).toBe('Hello world!');
    });

    test('should handle replacement at end', () => {
      const content = 'Hello (((name)))';
      const result = substitution.replaceInContent(content, 6, 11, 'John');

      expect(result).toBe('Hello John');
    });
  });

  describe('substitutePlaceholder', () => {
    test('should substitute standard placeholder', () => {
      const placeholder = {
        type: 'standard',
        cleanName: 'user.name',
        position: { index: 6, length: 15 },
      };
      const data = { user: { name: 'John Doe' } };
      const content = 'Hello (((user.name))), welcome!';

      const result = substitution.substitutePlaceholder(placeholder, data, content);

      expect(result.success).toBe(true);
      expect(result.content).toBe('Hello John Doe, welcome!');
      expect(result.shouldDelete).toBe(false);
    });

    test('should substitute numeric directive placeholder', () => {
      const placeholder = {
        type: 'numeric',
        cleanName: 'sales.q1',
        numericValue: 123456,
        position: { index: 0, length: 21 },
      };
      const data = { sales: { q1: 75000 } };
      const content = '(((123456=sales.q1)))';

      const result = substitution.substitutePlaceholder(placeholder, data, content);

      expect(result.success).toBe(true);
      // Numeric directives markers are removed - actual replacement happens globally
      expect(result.content).toBe('');
    });

    test('should process delete directive placeholder', () => {
      const placeholder = {
        type: 'delete',
        cleanName: 'optional.content',
        directive: 'DeletePageIfEmpty',
        position: { index: 0, length: 40 },
      };
      const data = { optional: { content: '' } }; // Empty content
      const content = '(((DeletePageIfEmpty=optional.content)))';

      const result = substitution.substitutePlaceholder(placeholder, data, content);

      expect(result.success).toBe(true);
      expect(result.content).toBe('');
      expect(result.shouldDelete).toBe(true);
    });

    test('should handle missing data in non-strict mode', () => {
      substitution.configure({ strictMode: false, preserveUnmatched: true });

      const placeholder = {
        type: 'standard',
        cleanName: 'missing.data',
        position: { index: 6, length: 18 },
      };
      const data = {};
      const content = 'Hello (((missing.data))), welcome!';

      const result = substitution.substitutePlaceholder(placeholder, data, content);

      expect(result.success).toBe(false);
      expect(result.content).toBe(content); // Unchanged
    });

    test('should remove unmatched placeholders when preserveUnmatched is false', () => {
      substitution.configure({ strictMode: false, preserveUnmatched: false });

      const placeholder = {
        type: 'standard',
        cleanName: 'missing.data',
        position: { index: 6, length: 18 },
      };
      const data = {};
      const content = 'Hello (((missing.data))), welcome!';

      const result = substitution.substitutePlaceholder(placeholder, data, content);

      expect(result.success).toBe(false);
      expect(result.content).toBe('Hello , welcome!');
    });
  });

  describe('processNumericDirective', () => {
    test('should process valid numeric values', () => {
      const placeholder = { cleanName: 'chart.value', numericValue: 123 };

      expect(substitution.processNumericDirective(placeholder, '456')).toBe(456);
      expect(substitution.processNumericDirective(placeholder, 789)).toBe(789);
      expect(substitution.processNumericDirective(placeholder, '123.45')).toBe(123.45);
    });

    test('should fallback to original value for non-numeric input', () => {
      const placeholder = { cleanName: 'chart.value', numericValue: 123 };

      expect(substitution.processNumericDirective(placeholder, 'not-a-number')).toBe(123);
      expect(substitution.processNumericDirective(placeholder, null)).toBe(123);
      expect(substitution.processNumericDirective(placeholder, undefined)).toBe(123);
    });
  });

  describe('processDeleteDirective', () => {
    test('should mark for deletion when condition is empty', () => {
      const placeholder = { cleanName: 'condition', directive: 'DeletePageIfEmpty' };
      const data = { condition: '' };

      const result = substitution.processDeleteDirective(placeholder, data);

      expect(result.shouldDelete).toBe(true);
      expect(result.replacement).toBe('');
    });

    test('should not mark for deletion when condition has value', () => {
      const placeholder = { cleanName: 'condition', directive: 'DeletePageIfEmpty' };
      const data = { condition: 'has content' };

      const result = substitution.processDeleteDirective(placeholder, data);

      expect(result.shouldDelete).toBe(false);
      expect(result.replacement).toBe('has content');
    });
  });

  describe('substituteDocument', () => {
    test('should substitute placeholders in multiple files', () => {
      const parseResult = {
        fileMap: new Map([
          [
            'file1.xml',
            [
              {
                type: 'standard',
                cleanName: 'user.name',
                position: { index: 6, length: 15, file: 'file1.xml' },
              },
            ],
          ],
        ]),
        deleteDirectives: [],
        uniquePlaceholderList: ['user.name'],
      };

      const data = { user: { name: 'John Doe' } };
      const xmlFiles = [{ path: 'file1.xml', content: 'Hello (((user.name))), welcome!' }];

      const result = substitution.substituteDocument(parseResult, data, xmlFiles);

      expect(result.success).toBe(true);
      expect(result.modifiedFiles.get('file1.xml').content).toBe('Hello John Doe, welcome!');
      expect(result.modifiedFiles.get('file1.xml').modified).toBe(true);
    });

    test('should handle files with no modifications', () => {
      const parseResult = {
        fileMap: new Map(),
        deleteDirectives: [],
        uniquePlaceholderList: [],
      };

      const data = {};
      const xmlFiles = [{ path: 'file1.xml', content: 'No placeholders here' }];

      const result = substitution.substituteDocument(parseResult, data, xmlFiles);

      expect(result.success).toBe(true);
      expect(result.modifiedFiles.size).toBe(0);
    });
  });

  describe('validateData', () => {
    test('should validate complete data successfully', () => {
      const parseResult = {
        uniquePlaceholderList: ['user.name', 'user.email'],
        numericDirectives: [{ cleanName: 'chart.value' }],
      };

      const data = {
        user: { name: 'John', email: 'john@example.com' },
        chart: { value: 123 },
      };

      const result = substitution.validateData(parseResult, data);

      expect(result.valid).toBe(true);
      expect(result.missing).toEqual([]);
      expect(result.available).toEqual(['user.name', 'user.email']);
      expect(result.typeErrors).toEqual([]);
      expect(result.coverage).toBe(100);
    });

    test('should identify missing data', () => {
      const parseResult = {
        uniquePlaceholderList: ['user.name', 'user.email', 'missing.data'],
        numericDirectives: [],
      };

      const data = {
        user: { name: 'John', email: 'john@example.com' },
      };

      const result = substitution.validateData(parseResult, data);

      expect(result.valid).toBe(false);
      expect(result.missing).toEqual(['missing.data']);
      expect(result.available).toEqual(['user.name', 'user.email']);
      expect(result.coverage).toBeCloseTo(66.67, 1);
    });

    test('should identify type errors for numeric directives', () => {
      const parseResult = {
        uniquePlaceholderList: ['chart.value'],
        numericDirectives: [{ cleanName: 'chart.value' }],
      };

      const data = {
        chart: { value: 'not-a-number' },
      };

      const result = substitution.validateData(parseResult, data);

      expect(result.valid).toBe(false);
      expect(result.typeErrors).toHaveLength(1);
      expect(result.typeErrors[0].placeholder).toBe('chart.value');
      expect(result.typeErrors[0].expected).toBe('number');
      expect(result.typeErrors[0].received).toBe('string');
    });
  });

  describe('statistics and configuration', () => {
    test('should track substitution statistics', () => {
      substitution.stats.totalSubstitutions = 10;
      substitution.stats.successfulSubstitutions = 8;
      substitution.stats.failedSubstitutions = 2;

      const stats = substitution.getStats();

      expect(stats.totalSubstitutions).toBe(10);
      expect(stats.successfulSubstitutions).toBe(8);
      expect(stats.failedSubstitutions).toBe(2);
      expect(stats.successRate).toBe(80);
    });

    test('should reset statistics', () => {
      substitution.stats.totalSubstitutions = 10;
      substitution.resetStats();

      expect(substitution.stats.totalSubstitutions).toBe(0);
      expect(substitution.stats.successfulSubstitutions).toBe(0);
      expect(substitution.stats.failedSubstitutions).toBe(0);
    });

    test('should configure options', () => {
      substitution.configure({
        strictMode: true,
        preserveUnmatched: false,
      });

      expect(substitution.options.strictMode).toBe(true);
      expect(substitution.options.preserveUnmatched).toBe(false);
      expect(substitution.options.logMissingData).toBe(true); // Should preserve existing
    });
  });

  describe('groupDeleteDirectivesByFile', () => {
    test('should group delete directives by file path', () => {
      const deleteDirectives = [
        { position: { file: 'file1.xml' }, directive: 'DeletePageIfEmpty' },
        { position: { file: 'file2.xml' }, directive: 'DeleteSlideIfEmpty' },
        { position: { file: 'file1.xml' }, directive: 'DeleteRowIfEmpty' },
      ];

      const grouped = substitution.groupDeleteDirectivesByFile(deleteDirectives);

      expect(grouped.size).toBe(2);
      expect(grouped.get('file1.xml')).toHaveLength(2);
      expect(grouped.get('file2.xml')).toHaveLength(1);
    });
  });

  describe('Edge cases coverage', () => {
    test('should handle invalid fileMap in substituteDocument', () => {
      const parseResult = {
        fileMap: null, // Invalid fileMap
        placeholders: { all: [], unique: [] },
      };
      const data = {};
      const xmlFiles = [];

      const result = substitution.substituteDocument(parseResult, data, xmlFiles);

      expect(result.success).toBe(true);
      expect(result.modifiedFiles.size).toBe(0);
    });

    test('should skip files not found in xmlFiles', () => {
      const fileMap = new Map();
      fileMap.set('missing.xml', [{ cleanName: 'test', rawMatch: '(((test)))' }]);

      const parseResult = {
        fileMap,
        placeholders: { all: [], unique: [] },
        deleteDirectives: [], // Add this field
      };
      const data = { test: 'value' };
      const xmlFiles = []; // No matching files

      const result = substitution.substituteDocument(parseResult, data, xmlFiles);

      expect(result.success).toBe(true);
      expect(result.modifiedFiles.size).toBe(0);
    });

    test('should handle empty data object', () => {
      const content = 'Text with (((placeholder)))';
      const placeholder = {
        cleanName: 'placeholder',
        rawMatch: '(((placeholder)))',
        position: { index: 10, length: 19 },
      };
      const data = {}; // Empty data

      const result = substitution.substitutePlaceholder(placeholder, data, content);

      expect(result.content).toContain('(((placeholder)))'); // Should preserve placeholder
    });

    test('should handle exceptions in substitutePlaceholder without strict mode', () => {
      const substitutionNoStrict = new PlaceholderSubstitution({ strictMode: false });

      // Create a malformed placeholder that will cause an error
      const placeholder = {
        cleanName: 'test',
        rawMatch: '(((test)))',
        position: null, // This will cause error accessing position.index
        type: 'string',
      };
      const content = 'Some (((test))) content';
      const data = { test: 'value' };

      const result = substitutionNoStrict.substitutePlaceholder(placeholder, data, content);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.content).toBe(content); // Original content preserved
    });
  });
});
