/**
 * Placeholder Parser tests
 */

const PlaceholderParser = require('../../../src/core/placeholder-parser');

describe('PlaceholderParser', () => {
  let parser;

  beforeEach(() => {
    parser = new PlaceholderParser();
  });

  describe('Constructor', () => {
    test('should create instance', () => {
      expect(parser).toBeInstanceOf(PlaceholderParser);
      expect(parser.patterns).toBeDefined();
      expect(parser.cache).toBeInstanceOf(Map);
    });

    test('should have correct regex patterns', () => {
      expect(parser.patterns.standard).toBeInstanceOf(RegExp);
      expect(parser.patterns.numeric).toBeInstanceOf(RegExp);
      expect(parser.patterns.deleteDirective).toBeInstanceOf(RegExp);
      expect(parser.patterns.any).toBeInstanceOf(RegExp);
    });
  });

  describe('findAllPlaceholders', () => {
    test('should find standard placeholders', () => {
      const content = 'Hello (((user.name))), your email is (((user.email))).';
      const matches = parser.findAllPlaceholders(content);

      expect(matches).toHaveLength(2);
      expect(matches[0].type).toBe('standard');
      expect(matches[0].content).toBe('user.name');
      expect(matches[0].fullMatch).toBe('(((user.name)))');
      expect(matches[1].content).toBe('user.email');
    });

    test('should find numeric directive placeholders', () => {
      const content = 'Chart data: (((123456=sales.q1))) and (((789012=sales.q2)))';
      const matches = parser.findAllPlaceholders(content);

      expect(matches).toHaveLength(2);
      expect(matches[0].type).toBe('numeric');
      expect(matches[0].numericValue).toBe('123456');
      expect(matches[0].content).toBe('sales.q1');
      expect(matches[1].numericValue).toBe('789012');
      expect(matches[1].content).toBe('sales.q2');
    });

    test('should find delete directive placeholders', () => {
      const content =
        '(((DeletePageIfEmpty=optional.content))) and (((DeleteSlideIfEmpty=slide.data)))';
      const matches = parser.findAllPlaceholders(content);

      expect(matches).toHaveLength(2);
      expect(matches[0].type).toBe('delete');
      expect(matches[0].directive).toBe('DeletePageIfEmpty');
      expect(matches[0].content).toBe('optional.content');
      expect(matches[1].directive).toBe('DeleteSlideIfEmpty');
      expect(matches[1].content).toBe('slide.data');
    });

    test('should find mixed placeholder types', () => {
      const content = `
        Regular: (((user.name)))
        Numeric: (((123456=chart.value)))
        Delete: (((DeletePageIfEmpty=condition)))
      `;
      const matches = parser.findAllPlaceholders(content);

      expect(matches).toHaveLength(3);
      expect(matches.map((m) => m.type)).toEqual(['standard', 'numeric', 'delete']);
    });

    test('should sort matches by position', () => {
      const content = 'End (((end))) Middle (((middle))) Start (((start)))';
      const matches = parser.findAllPlaceholders(content);

      expect(matches).toHaveLength(3);
      expect(matches[0].content).toBe('end');
      expect(matches[1].content).toBe('middle');
      expect(matches[2].content).toBe('start');
      expect(matches[0].index).toBeLessThan(matches[1].index);
      expect(matches[1].index).toBeLessThan(matches[2].index);
    });

    test('should handle empty content', () => {
      expect(parser.findAllPlaceholders('')).toEqual([]);
      expect(parser.findAllPlaceholders('No placeholders here')).toEqual([]);
    });
  });

  describe('parseXmlFile', () => {
    test('should parse placeholders from XML file', () => {
      const xmlFile = {
        path: 'word/document.xml',
        type: 'word',
        category: 'content',
        content: '<w:t>Dear (((customer.name))), your order is (((order.number))).</w:t>',
      };

      const placeholders = parser.parseXmlFile(xmlFile);

      expect(placeholders).toHaveLength(2);
      expect(placeholders[0].cleanName).toBe('customer.name');
      expect(placeholders[0].type).toBe('standard');
      expect(placeholders[0].position.file).toBe('word/document.xml');
      expect(placeholders[0].position.fileType).toBe('word');
      expect(placeholders[1].cleanName).toBe('order.number');
    });

    test('should handle XML file with no placeholders', () => {
      const xmlFile = {
        path: 'word/document.xml',
        type: 'word',
        category: 'content',
        content: '<w:t>No placeholders here</w:t>',
      };

      const placeholders = parser.parseXmlFile(xmlFile);
      expect(placeholders).toHaveLength(0);
    });

    test('should handle empty XML file', () => {
      const xmlFile = {
        path: 'word/document.xml',
        type: 'word',
        category: 'content',
        content: '',
      };

      const placeholders = parser.parseXmlFile(xmlFile);
      expect(placeholders).toHaveLength(0);
    });
  });

  describe('parseDocument', () => {
    test('should parse placeholders from multiple XML files', () => {
      const xmlFiles = [
        {
          path: 'word/document.xml',
          type: 'word',
          category: 'content',
          content: '<w:t>Hello (((user.name)))</w:t>',
        },
        {
          path: 'word/header1.xml',
          type: 'word',
          category: 'headerFooter',
          content: '<w:t>Date: (((document.date)))</w:t>',
        },
        {
          path: 'ppt/charts/chart1.xml',
          type: 'chart',
          category: 'chart',
          content: '<c:v>(((123456=sales.total)))</c:v>',
        },
      ];

      const result = parser.parseDocument({}, xmlFiles);

      expect(result.summary.totalPlaceholders).toBe(3);
      expect(result.summary.uniqueCount).toBe(3);
      expect(result.summary.filesWithPlaceholders).toBe(3);
      expect(result.summary.numericDirectiveCount).toBe(1);
      expect(result.summary.deleteDirectiveCount).toBe(0);

      expect(result.uniquePlaceholderList).toContain('user.name');
      expect(result.uniquePlaceholderList).toContain('document.date');
      expect(result.uniquePlaceholderList).toContain('sales.total');

      expect(result.numericDirectives).toHaveLength(1);
      expect(result.numericDirectives[0].numericValue).toBe(123456);
    });

    test('should handle duplicate placeholders', () => {
      const xmlFiles = [
        {
          path: 'word/document.xml',
          type: 'word',
          category: 'content',
          content: '<w:t>(((user.name))) and (((user.name))) again</w:t>',
        },
        {
          path: 'word/header1.xml',
          type: 'word',
          category: 'headerFooter',
          content: '<w:t>Header: (((user.name)))</w:t>',
        },
      ];

      const result = parser.parseDocument({}, xmlFiles);

      expect(result.summary.totalPlaceholders).toBe(3);
      expect(result.summary.uniqueCount).toBe(1);
      expect(result.uniquePlaceholderList).toEqual(['user.name']);
    });

    test('should use cache for identical documents', () => {
      const xmlFiles = [
        {
          path: 'word/document.xml',
          type: 'word',
          category: 'content',
          content: '<w:t>Hello (((user.name)))</w:t>',
        },
      ];

      const result1 = parser.parseDocument({}, xmlFiles);
      const result2 = parser.parseDocument({}, xmlFiles);

      expect(result1).toBe(result2); // Should be the same object from cache
      expect(parser.cache.size).toBe(1);
    });
  });

  describe('createPlaceholderObject', () => {
    test('should create standard placeholder object', () => {
      const match = {
        type: 'standard',
        fullMatch: '(((user.name)))',
        content: 'user.name',
        index: 6,
        length: 15,
      };
      const xmlFile = {
        path: 'word/document.xml',
        type: 'word',
        category: 'content',
        content: 'Hello (((user.name)))',
      };

      const placeholder = parser.createPlaceholderObject(match, xmlFile);

      expect(placeholder.type).toBe('standard');
      expect(placeholder.rawPattern).toBe('(((user.name)))');
      expect(placeholder.cleanName).toBe('user.name');
      expect(placeholder.position.file).toBe('word/document.xml');
      expect(placeholder.position.index).toBe(6);
      expect(placeholder.context).toBeDefined();
      expect(placeholder.context.placeholder).toBe('(((user.name)))');
    });

    test('should create numeric placeholder object', () => {
      const match = {
        type: 'numeric',
        fullMatch: '(((123456=sales.q1)))',
        numericValue: '123456',
        content: 'sales.q1',
        index: 0,
        length: 20,
      };
      const xmlFile = {
        path: 'ppt/charts/chart1.xml',
        type: 'chart',
        category: 'chart',
        content: '(((123456=sales.q1)))',
      };

      const placeholder = parser.createPlaceholderObject(match, xmlFile);

      expect(placeholder.type).toBe('numeric');
      expect(placeholder.numericValue).toBe(123456);
      expect(placeholder.originalNumber).toBe('123456');
      expect(placeholder.cleanName).toBe('sales.q1');
    });

    test('should create delete placeholder object', () => {
      const match = {
        type: 'delete',
        fullMatch: '(((DeletePageIfEmpty=condition)))',
        directive: 'DeletePageIfEmpty',
        content: 'condition',
        index: 0,
        length: 30,
      };
      const xmlFile = {
        path: 'word/document.xml',
        type: 'word',
        category: 'content',
        content: '(((DeletePageIfEmpty=condition)))',
      };

      const placeholder = parser.createPlaceholderObject(match, xmlFile);

      expect(placeholder.type).toBe('delete');
      expect(placeholder.directive).toBe('DeletePageIfEmpty');
      expect(placeholder.deleteType).toBe('page');
      expect(placeholder.cleanName).toBe('condition');
    });
  });

  describe('extractContext', () => {
    test('should extract context around placeholder', () => {
      const content = 'This is some text with (((placeholder))) in the middle of content';
      const index = 23;
      const length = 17;

      const context = parser.extractContext(content, index, length, 10);

      expect(context.before).toBe('text with ');
      expect(context.placeholder).toBe('(((placeholder)))');
      expect(context.after).toBe(' in the mi');
      expect(context.fullContext).toBe('text with (((placeholder))) in the mi');
    });

    test('should handle context at document boundaries', () => {
      const content = '(((start))) and (((end)))';

      let context = parser.extractContext(content, 0, 11, 5);
      expect(context.before).toBe('');
      expect(context.placeholder).toBe('(((start)))');

      context = parser.extractContext(content, 16, 9, 5);
      expect(context.after).toBe('');
      expect(context.placeholder).toBe('(((end)))');
    });
  });

  describe('getDeleteType', () => {
    test('should determine delete types correctly', () => {
      expect(parser.getDeleteType('DeletePageIfEmpty')).toBe('page');
      expect(parser.getDeleteType('DeleteSlideIfEmpty')).toBe('slide');
      expect(parser.getDeleteType('DeleteRowIfEmpty')).toBe('row');
      expect(parser.getDeleteType('DeleteSectionIfEmpty')).toBe('section');
      expect(parser.getDeleteType('DeleteUnknownIfEmpty')).toBe('unknown');
    });
  });

  describe('utility methods', () => {
    test('getUniquePlaceholders should return unique placeholder list', () => {
      const parseResult = { uniquePlaceholderList: ['user.name', 'user.email'] };
      expect(parser.getUniquePlaceholders(parseResult)).toEqual(['user.name', 'user.email']);
    });

    test('getNumericDirectives should return numeric directives', () => {
      const numericDirectives = [{ type: 'numeric', numericValue: 123 }];
      const parseResult = { numericDirectives };
      expect(parser.getNumericDirectives(parseResult)).toBe(numericDirectives);
    });

    test('getDeleteDirectives should return delete directives', () => {
      const deleteDirectives = [{ type: 'delete', directive: 'DeletePageIfEmpty' }];
      const parseResult = { deleteDirectives };
      expect(parser.getDeleteDirectives(parseResult)).toBe(deleteDirectives);
    });

    test('clearCache should clear the cache', () => {
      parser.cache.set('test', 'value');
      expect(parser.cache.size).toBe(1);

      parser.clearCache();
      expect(parser.cache.size).toBe(0);
    });
  });

  describe('placeholder name validation', () => {
    test('isValidPlaceholderName should validate correctly', () => {
      expect(parser.isValidPlaceholderName('user.name')).toBe(true);
      expect(parser.isValidPlaceholderName('simple')).toBe(true);
      expect(parser.isValidPlaceholderName('deeply.nested.property')).toBe(true);

      expect(parser.isValidPlaceholderName('')).toBe(false);
      expect(parser.isValidPlaceholderName('   ')).toBe(false);
      expect(parser.isValidPlaceholderName(null)).toBe(false);
      expect(parser.isValidPlaceholderName(undefined)).toBe(false);
      expect(parser.isValidPlaceholderName(123)).toBe(false);

      // Very long name should be invalid
      const longName = 'a'.repeat(201);
      expect(parser.isValidPlaceholderName(longName)).toBe(false);
    });

    test('parsePlaceholderName should parse name parts', () => {
      expect(parser.parsePlaceholderName('user.name')).toEqual(['user', 'name']);
      expect(parser.parsePlaceholderName('simple')).toEqual(['simple']);
      expect(parser.parsePlaceholderName('deeply.nested.property')).toEqual([
        'deeply',
        'nested',
        'property',
      ]);
      expect(parser.parsePlaceholderName('user..name')).toEqual(['user', 'name']); // Filters empty

      expect(parser.parsePlaceholderName('')).toEqual([]);
      expect(parser.parsePlaceholderName(null)).toEqual([]);
    });
  });

  describe('caching', () => {
    test('generateCacheKey should create consistent keys', () => {
      const xmlFiles1 = [
        { path: 'file1.xml', content: 'content1' },
        { path: 'file2.xml', content: 'content2' },
      ];
      const xmlFiles2 = [
        { path: 'file2.xml', content: 'content2' },
        { path: 'file1.xml', content: 'content1' },
      ];

      const key1 = parser.generateCacheKey(xmlFiles1);
      const key2 = parser.generateCacheKey(xmlFiles2);

      expect(key1).toBe(key2); // Should be same regardless of order
    });

    test('simpleHash should generate numeric hash', () => {
      const hash1 = parser.simpleHash('test content');
      const hash2 = parser.simpleHash('test content');
      const hash3 = parser.simpleHash('different content');

      expect(typeof hash1).toBe('number');
      expect(hash1).toBe(hash2);
      expect(hash1).not.toBe(hash3);
    });
  });
});
