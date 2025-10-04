/**
 * Integration tests for DeleteIfEmpty functionality
 */

const PlaceholderParser = require('../../src/core/placeholder-parser');
const PlaceholderSubstitution = require('../../src/core/placeholder-substitution');

describe('DeleteIfEmpty Integration Tests', () => {
  let parser;
  let substitution;

  beforeEach(() => {
    parser = new PlaceholderParser();
    substitution = new PlaceholderSubstitution();
  });

  describe('Word Document Page Deletion', () => {
    test('should detect DeletePageIfEmpty directive in Word document', () => {
      const xmlFiles = [
        {
          path: 'word/document.xml',
          content:
            '<w:p><w:r><w:t>(((DeletePageIfEmpty=section1)))</w:t></w:r></w:p>' +
            '<w:p><w:r><w:t>Page content here</w:t></w:r></w:p>',
          type: 'word',
          category: 'content',
        },
      ];

      const parseResult = parser.parseDocument(null, xmlFiles);

      expect(parseResult.deleteDirectives).toHaveLength(1);
      expect(parseResult.deleteDirectives[0].cleanName).toBe('section1');
      expect(parseResult.deleteDirectives[0].deleteType).toBe('page');
    });

    test('should delete page when placeholder value is empty', () => {
      const xmlFiles = [
        {
          path: 'word/document.xml',
          content:
            '<w:p><w:r><w:t>Page 1 content</w:t></w:r></w:p>' +
            '<w:p><w:r><w:br w:type="page"/></w:r></w:p>' +
            '<w:p><w:r><w:t>(((DeletePageIfEmpty=emptySection)))</w:t></w:r></w:p>' +
            '<w:p><w:r><w:t>This page should be deleted</w:t></w:r></w:p>' +
            '<w:p><w:r><w:br w:type="page"/></w:r></w:p>' +
            '<w:p><w:r><w:t>Page 3 content</w:t></w:r></w:p>',
          type: 'word',
          category: 'content',
        },
      ];

      const parseResult = parser.parseDocument(null, xmlFiles);

      const data = {
        emptySection: '', // Empty value triggers deletion
      };

      const substResult = substitution.substituteDocument(parseResult, data, xmlFiles);

      expect(substResult.success).toBe(true);
      expect(substResult.stats.deletedElements).toBeGreaterThan(0);
    });

    test('should keep page when placeholder value has content', () => {
      const xmlFiles = [
        {
          path: 'word/document.xml',
          content:
            '<w:p><w:r><w:t>Page 1 content</w:t></w:r></w:p>' +
            '<w:p><w:r><w:br w:type="page"/></w:r></w:p>' +
            '<w:p><w:r><w:t>(((DeletePageIfEmpty=section)))</w:t></w:r></w:p>' +
            '<w:p><w:r><w:t>This page should be kept</w:t></w:r></w:p>',
          type: 'word',
          category: 'content',
        },
      ];

      const parseResult = parser.parseDocument(null, xmlFiles);

      const data = {
        section: 'Important content', // Non-empty value keeps the page
      };

      const substResult = substitution.substituteDocument(parseResult, data, xmlFiles);

      expect(substResult.stats.deletedElements).toBe(0);
      const modifiedFile = substResult.modifiedFiles.get('word/document.xml');
      expect(modifiedFile.content).toContain('This page should be kept');
    });
  });

  describe('PowerPoint Slide Deletion', () => {
    test('should detect DeleteSlideIfEmpty directive in PowerPoint', () => {
      const xmlFiles = [
        {
          path: 'ppt/slides/slide1.xml',
          content: '<p:sld><p:txBody><a:p><a:r><a:t>(((DeleteSlideIfEmpty=slide1)))</a:t></a:r></a:p></p:txBody></p:sld>',
          type: 'powerpoint',
          category: 'content',
        },
      ];

      const parseResult = parser.parseDocument(null, xmlFiles);

      expect(parseResult.deleteDirectives).toHaveLength(1);
      expect(parseResult.deleteDirectives[0].cleanName).toBe('slide1');
      expect(parseResult.deleteDirectives[0].deleteType).toBe('slide');
    });

    test('should mark slide for deletion when value is empty', () => {
      const xmlFiles = [
        {
          path: 'ppt/slides/slide1.xml',
          content: '<p:sld><p:txBody><a:p><a:r><a:t>(((DeleteSlideIfEmpty=emptySlide)))</a:t></a:r></a:p></p:txBody></p:sld>',
          type: 'powerpoint',
          category: 'content',
        },
        {
          path: 'ppt/slides/slide2.xml',
          content: '<p:sld><p:txBody><a:p><a:r><a:t>Keep this slide</a:t></a:r></a:p></p:txBody></p:sld>',
          type: 'powerpoint',
          category: 'content',
        },
      ];

      const parseResult = parser.parseDocument(null, xmlFiles);

      const data = {
        emptySlide: null, // Null value triggers deletion
      };

      const substResult = substitution.substituteDocument(parseResult, data, xmlFiles);

      expect(substResult.success).toBe(true);

      // Check if slide1 is marked for deletion
      const slide1 = substResult.modifiedFiles.get('ppt/slides/slide1.xml');
      if (slide1) {
        expect(slide1.markedForDeletion || slide1.content === '').toBe(true);
      }

      // Slide2 should remain unchanged
      const slide2 = substResult.modifiedFiles.get('ppt/slides/slide2.xml');
      if (slide2) {
        expect(slide2.content).toContain('Keep this slide');
      }
    });

    test('should keep slide when value has content', () => {
      const xmlFiles = [
        {
          path: 'ppt/slides/slide1.xml',
          content: '<p:sld><p:txBody><a:p><a:r><a:t>(((DeleteSlideIfEmpty=slideContent)))</a:t></a:r></a:p></p:txBody></p:sld>',
          type: 'powerpoint',
          category: 'content',
        },
      ];

      const parseResult = parser.parseDocument(null, xmlFiles);

      const data = {
        slideContent: 'Has content', // Non-empty value keeps the slide
      };

      const substResult = substitution.substituteDocument(parseResult, data, xmlFiles);

      expect(substResult.stats.deletedElements).toBe(0);
      const slide = substResult.modifiedFiles.get('ppt/slides/slide1.xml');
      if (slide) {
        expect(slide.markedForDeletion).toBeFalsy();
      }
    });
  });

  describe('Multiple Delete Directives', () => {
    test('should handle multiple delete directives in same document', () => {
      const xmlFiles = [
        {
          path: 'word/document.xml',
          content:
            '<w:p><w:r><w:t>(((DeletePageIfEmpty=section1)))</w:t></w:r></w:p>' +
            '<w:p><w:r><w:t>Section 1</w:t></w:r></w:p>' +
            '<w:p><w:r><w:br w:type="page"/></w:r></w:p>' +
            '<w:p><w:r><w:t>(((DeletePageIfEmpty=section2)))</w:t></w:r></w:p>' +
            '<w:p><w:r><w:t>Section 2</w:t></w:r></w:p>',
          type: 'word',
          category: 'content',
        },
      ];

      const parseResult = parser.parseDocument(null, xmlFiles);

      expect(parseResult.deleteDirectives).toHaveLength(2);

      const data = {
        section1: '', // Delete this
        section2: 'Keep this', // Keep this
      };

      const substResult = substitution.substituteDocument(parseResult, data, xmlFiles);

      expect(substResult.success).toBe(true);
      // At least one page should be deleted
      expect(substResult.stats.deletedElements).toBeGreaterThan(0);
    });

    test('should handle mixed document types', () => {
      const xmlFiles = [
        {
          path: 'word/document.xml',
          content: '<w:p><w:r><w:t>(((DeletePageIfEmpty=wordSection)))</w:t></w:r></w:p>',
          type: 'word',
          category: 'content',
        },
        {
          path: 'ppt/slides/slide1.xml',
          content: '<p:sld><p:txBody><a:p><a:r><a:t>(((DeleteSlideIfEmpty=pptSection)))</a:t></a:r></a:p></p:txBody></p:sld>',
          type: 'powerpoint',
          category: 'content',
        },
      ];

      const parseResult = parser.parseDocument(null, xmlFiles);

      expect(parseResult.deleteDirectives).toHaveLength(2);
      expect(parseResult.deleteDirectives.some((d) => d.deleteType === 'page')).toBe(true);
      expect(parseResult.deleteDirectives.some((d) => d.deleteType === 'slide')).toBe(true);

      const data = {
        wordSection: '',
        pptSection: null,
      };

      const substResult = substitution.substituteDocument(parseResult, data, xmlFiles);

      expect(substResult.success).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    test('should handle delete directive with undefined value', () => {
      const xmlFiles = [
        {
          path: 'word/document.xml',
          content: '<w:p><w:r><w:t>(((DeletePageIfEmpty=undefinedValue)))</w:t></w:r></w:p>',
          type: 'word',
          category: 'content',
        },
      ];

      const parseResult = parser.parseDocument(null, xmlFiles);

      const data = {}; // undefinedValue is not provided

      const substResult = substitution.substituteDocument(parseResult, data, xmlFiles);

      expect(substResult.success).toBe(true);
      // Undefined should be treated as empty
      expect(substResult.stats.deletedElements).toBeGreaterThan(0);
    });

    test('should handle delete directive with zero value', () => {
      const xmlFiles = [
        {
          path: 'word/document.xml',
          content: '<w:p><w:r><w:t>(((DeletePageIfEmpty=zeroValue)))</w:t></w:r></w:p>',
          type: 'word',
          category: 'content',
        },
      ];

      const parseResult = parser.parseDocument(null, xmlFiles);

      const data = {
        zeroValue: 0, // Zero is not empty
      };

      const substResult = substitution.substituteDocument(parseResult, data, xmlFiles);

      // Zero should NOT trigger deletion
      expect(substResult.stats.deletedElements).toBe(0);
    });

    test('should handle delete directive with false value', () => {
      const xmlFiles = [
        {
          path: 'word/document.xml',
          content: '<w:p><w:r><w:t>(((DeletePageIfEmpty=falseValue)))</w:t></w:r></w:p>',
          type: 'word',
          category: 'content',
        },
      ];

      const parseResult = parser.parseDocument(null, xmlFiles);

      const data = {
        falseValue: false, // False is not empty
      };

      const substResult = substitution.substituteDocument(parseResult, data, xmlFiles);

      // False should NOT trigger deletion
      expect(substResult.stats.deletedElements).toBe(0);
    });

    test('should handle empty array as empty value', () => {
      const xmlFiles = [
        {
          path: 'word/document.xml',
          content: '<w:p><w:r><w:t>(((DeletePageIfEmpty=emptyArray)))</w:t></w:r></w:p>',
          type: 'word',
          category: 'content',
        },
      ];

      const parseResult = parser.parseDocument(null, xmlFiles);

      const data = {
        emptyArray: [], // Empty array should trigger deletion
      };

      const substResult = substitution.substituteDocument(parseResult, data, xmlFiles);

      expect(substResult.stats.deletedElements).toBeGreaterThan(0);
    });

    test('should handle empty object as empty value', () => {
      const xmlFiles = [
        {
          path: 'word/document.xml',
          content: '<w:p><w:r><w:t>(((DeletePageIfEmpty=emptyObject)))</w:t></w:r></w:p>',
          type: 'word',
          category: 'content',
        },
      ];

      const parseResult = parser.parseDocument(null, xmlFiles);

      const data = {
        emptyObject: {}, // Empty object should trigger deletion
      };

      const substResult = substitution.substituteDocument(parseResult, data, xmlFiles);

      expect(substResult.stats.deletedElements).toBeGreaterThan(0);
    });
  });
});
