/**
 * Integration tests for placeholder detection using real Office document samples
 */

const PlaceholderParser = require('../../src/core/placeholder-parser');
const fs = require('fs').promises;
const path = require('path');

describe('Placeholder Detection Integration', () => {
  let placeholderParser;

  beforeEach(() => {
    placeholderParser = new PlaceholderParser();
  });

  async function loadFixture(filename) {
    const fixturePath = path.join(__dirname, '../fixtures', filename);
    return await fs.readFile(fixturePath, 'utf8');
  }

  describe('Real Office Document Samples', () => {
    test('should parse Word document placeholders', async () => {
      const wordContent = await loadFixture('sample-word-document.xml');
      const xmlFiles = [
        {
          path: 'word/document.xml',
          type: 'word',
          category: 'content',
          content: wordContent,
        },
      ];

      const result = placeholderParser.parseDocument({}, xmlFiles);

      expect(result.summary.totalPlaceholders).toBe(5);
      expect(result.summary.uniqueCount).toBe(5);
      expect(result.summary.deleteDirectiveCount).toBe(1);

      expect(result.uniquePlaceholderList).toContain('customer.name');
      expect(result.uniquePlaceholderList).toContain('order.number');
      expect(result.uniquePlaceholderList).toContain('order.total');
      expect(result.uniquePlaceholderList).toContain('customer.address');

      const deleteDirective = result.deleteDirectives[0];
      expect(deleteDirective.directive).toBe('DeletePageIfEmpty');
      expect(deleteDirective.cleanName).toBe('optional.content');
      expect(deleteDirective.deleteType).toBe('page');
    });

    test('should parse PowerPoint slide placeholders', async () => {
      const pptContent = await loadFixture('sample-ppt-slide.xml');
      const xmlFiles = [
        {
          path: 'ppt/slides/slide1.xml',
          type: 'powerpoint',
          category: 'content',
          content: pptContent,
        },
      ];

      const result = placeholderParser.parseDocument({}, xmlFiles);

      expect(result.summary.totalPlaceholders).toBe(4);
      expect(result.summary.uniqueCount).toBe(4);
      expect(result.summary.deleteDirectiveCount).toBe(1);

      expect(result.uniquePlaceholderList).toContain('presentation.title');
      expect(result.uniquePlaceholderList).toContain('presenter.name');
      expect(result.uniquePlaceholderList).toContain('presentation.date');
      expect(result.uniquePlaceholderList).toContain('optional.slide.content');

      const deleteDirective = result.deleteDirectives[0];
      expect(deleteDirective.directive).toBe('DeleteSlideIfEmpty');
      expect(deleteDirective.cleanName).toBe('optional.slide.content');
      expect(deleteDirective.deleteType).toBe('slide');
    });

    test('should parse Excel worksheet placeholders', async () => {
      const excelContent = await loadFixture('sample-excel-sheet.xml');
      const xmlFiles = [
        {
          path: 'xl/worksheets/sheet1.xml',
          type: 'excel',
          category: 'content',
          content: excelContent,
        },
      ];

      const result = placeholderParser.parseDocument({}, xmlFiles);

      expect(result.summary.totalPlaceholders).toBe(4);
      expect(result.summary.uniqueCount).toBe(4);

      expect(result.uniquePlaceholderList).toContain('product.name');
      expect(result.uniquePlaceholderList).toContain('product.price');
      expect(result.uniquePlaceholderList).toContain('product.quantity');
      expect(result.uniquePlaceholderList).toContain('product.total');
    });

    test('should parse chart numeric directives', async () => {
      const chartContent = await loadFixture('sample-chart.xml');
      const xmlFiles = [
        {
          path: 'ppt/charts/chart1.xml',
          type: 'chart',
          category: 'chart',
          content: chartContent,
        },
      ];

      const result = placeholderParser.parseDocument({}, xmlFiles);

      expect(result.summary.totalPlaceholders).toBe(5);
      expect(result.summary.uniqueCount).toBe(5);
      expect(result.summary.numericDirectiveCount).toBe(4);

      expect(result.uniquePlaceholderList).toContain('chart.title');
      expect(result.uniquePlaceholderList).toContain('sales.q1');
      expect(result.uniquePlaceholderList).toContain('sales.q2');
      expect(result.uniquePlaceholderList).toContain('sales.q3');
      expect(result.uniquePlaceholderList).toContain('sales.q4');

      const numericDirectives = result.numericDirectives;
      expect(numericDirectives).toHaveLength(4);

      const q1Directive = numericDirectives.find((d) => d.cleanName === 'sales.q1');
      expect(q1Directive.numericValue).toBe(123456);
      expect(q1Directive.originalNumber).toBe('123456');

      const q2Directive = numericDirectives.find((d) => d.cleanName === 'sales.q2');
      expect(q2Directive.numericValue).toBe(789012);
    });
  });

  describe('Complex Multi-File Documents', () => {
    test('should parse placeholders across multiple files', async () => {
      const wordContent = await loadFixture('sample-word-document.xml');
      const chartContent = await loadFixture('sample-chart.xml');

      const xmlFiles = [
        {
          path: 'word/document.xml',
          type: 'word',
          category: 'content',
          content: wordContent,
        },
        {
          path: 'word/charts/chart1.xml',
          type: 'chart',
          category: 'chart',
          content: chartContent,
        },
      ];

      const result = placeholderParser.parseDocument({}, xmlFiles);

      expect(result.summary.totalPlaceholders).toBe(10);
      expect(result.summary.uniqueCount).toBe(10);
      expect(result.summary.filesWithPlaceholders).toBe(2);
      expect(result.summary.numericDirectiveCount).toBe(4);
      expect(result.summary.deleteDirectiveCount).toBe(1);

      // Verify placeholders from both files are included
      expect(result.uniquePlaceholderList).toContain('customer.name'); // From Word
      expect(result.uniquePlaceholderList).toContain('chart.title'); // From Chart
      expect(result.uniquePlaceholderList).toContain('sales.q1'); // From Chart

      // Verify file mapping
      expect(result.fileMap.size).toBe(2);
      expect(result.fileMap.has('word/document.xml')).toBe(true);
      expect(result.fileMap.has('word/charts/chart1.xml')).toBe(true);
    });

    test('should handle duplicate placeholders across files', async () => {
      const content1 = '<w:t>User: (((user.name))) Email: (((user.email)))</w:t>';
      const content2 = '<w:t>Welcome (((user.name)))!</w:t>';

      const xmlFiles = [
        {
          path: 'word/document.xml',
          type: 'word',
          category: 'content',
          content: content1,
        },
        {
          path: 'word/header1.xml',
          type: 'word',
          category: 'headerFooter',
          content: content2,
        },
      ];

      const result = placeholderParser.parseDocument({}, xmlFiles);

      expect(result.summary.totalPlaceholders).toBe(3);
      expect(result.summary.uniqueCount).toBe(2);
      expect(result.uniquePlaceholderList).toEqual(['user.name', 'user.email']);

      // user.name should appear twice
      const userNamePlaceholders = result.placeholders.filter((p) => p.cleanName === 'user.name');
      expect(userNamePlaceholders).toHaveLength(2);
      expect(userNamePlaceholders[0].position.file).toBe('word/document.xml');
      expect(userNamePlaceholders[1].position.file).toBe('word/header1.xml');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle malformed placeholders gracefully', () => {
      const content = `
        Valid: (((user.name)))
        Incomplete: (((incomplete
        Invalid: (((
        Nested: (((outer (((inner))) outer)))
        Empty: ((()))
      `;

      const xmlFiles = [
        {
          path: 'test.xml',
          type: 'other',
          category: 'other',
          content,
        },
      ];

      const result = placeholderParser.parseDocument({}, xmlFiles);

      // Should only find the valid placeholder and the nested ones
      expect(result.summary.totalPlaceholders).toBeGreaterThan(0);
      expect(result.uniquePlaceholderList).toContain('user.name');
    });

    test('should handle very large documents efficiently', () => {
      // Create a large document with many placeholders
      const placeholders = Array.from({ length: 1000 }, (_, i) => `(((user.${i})))`).join(' ');
      const content = `<document>${placeholders}</document>`;

      const xmlFiles = [
        {
          path: 'large.xml',
          type: 'other',
          category: 'content',
          content,
        },
      ];

      const startTime = Date.now();
      const result = placeholderParser.parseDocument({}, xmlFiles);
      const endTime = Date.now();

      expect(result.summary.totalPlaceholders).toBe(1000);
      expect(result.summary.uniqueCount).toBe(1000);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete in under 1 second
    });

    test('should use caching for repeated processing', async () => {
      const wordContent = await loadFixture('sample-word-document.xml');
      const xmlFiles = [
        {
          path: 'word/document.xml',
          type: 'word',
          category: 'content',
          content: wordContent,
        },
      ];

      // First parse
      const result1 = placeholderParser.parseDocument({}, xmlFiles);

      // Second parse (should use cache)
      const result2 = placeholderParser.parseDocument({}, xmlFiles);

      expect(result1).toBe(result2); // Should be exact same object
      expect(placeholderParser.cache.size).toBe(1);
    });
  });

  describe('Placeholder Context Extraction', () => {
    test('should extract meaningful context for debugging', () => {
      const content =
        '<w:t>Dear valued customer (((customer.name))), thank you for your business.</w:t>';
      const xmlFiles = [
        {
          path: 'word/document.xml',
          type: 'word',
          category: 'content',
          content,
        },
      ];

      const result = placeholderParser.parseDocument({}, xmlFiles);
      const placeholder = result.placeholders[0];

      expect(placeholder.context.before).toContain('valued customer ');
      expect(placeholder.context.placeholder).toBe('(((customer.name)))');
      expect(placeholder.context.after).toContain(', thank you');
      expect(placeholder.context.fullContext).toContain('customer (((customer.name))), thank');
    });
  });
});
