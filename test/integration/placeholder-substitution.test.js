/**
 * Integration tests for placeholder substitution with real document workflow
 */

const PlaceholderParser = require('../../src/core/placeholder-parser');
const PlaceholderSubstitution = require('../../src/core/placeholder-substitution');

describe('Placeholder Substitution Integration', () => {
  let parser;
  let substitution;

  beforeEach(() => {
    parser = new PlaceholderParser();
    substitution = new PlaceholderSubstitution();
  });

  describe('End-to-End Substitution Workflow', () => {
    test('should perform complete parse and substitute workflow', () => {
      // Simulate XML files from a Word document
      const xmlFiles = [
        {
          path: 'word/document.xml',
          type: 'word',
          category: 'content',
          content: `
            <w:document>
              <w:body>
                <w:p>
                  <w:t>Dear (((customer.name))), thank you for your order #(((order.number))).</w:t>
                </w:p>
                <w:p>
                  <w:t>Total amount: $(((order.total)))</w:t>
                </w:p>
                <w:p>
                  <w:r><w:br w:type="page"/></w:r>
                </w:p>
                <w:p>
                  <w:t>(((DeletePageIfEmpty=optional.notes)))</w:t>
                </w:p>
                <w:p>
                  <w:t>Optional Notes Section</w:t>
                </w:p>
              </w:body>
            </w:document>
          `,
        },
        {
          path: 'word/charts/chart1.xml',
          type: 'chart',
          category: 'chart',
          content: `
            <c:chartSpace>
              <c:chart>
                <c:plotArea>
                  <c:barChart>
                    <c:ser>
                      <c:val>
                        <c:numRef>
                          <c:f>Sheet1!$B$2:$B$5</c:f>
                          <c:numCache>
                            <c:pt idx="0">
                              <c:v>(((123456=sales.q1)))</c:v>
                            </c:pt>
                            <c:pt idx="1">
                              <c:v>(((789012=sales.q2)))</c:v>
                            </c:pt>
                          </c:numCache>
                        </c:numRef>
                      </c:val>
                    </c:ser>
                  </c:barChart>
                </c:plotArea>
              </c:chart>
            </c:chartSpace>
          `,
        },
      ];

      const data = {
        customer: {
          name: 'John Smith',
        },
        order: {
          number: 'ORD-12345',
          total: '299.99',
        },
        sales: {
          q1: 125000,
          q2: 150000,
        },
        optional: {
          notes: '', // Empty, should trigger deletion
        },
      };

      // Step 1: Parse placeholders
      const parseResult = parser.parseDocument({}, xmlFiles);

      expect(parseResult.summary.totalPlaceholders).toBe(6);
      expect(parseResult.summary.uniqueCount).toBe(6);
      expect(parseResult.summary.numericDirectiveCount).toBe(2);
      expect(parseResult.summary.deleteDirectiveCount).toBe(1);

      // Step 2: Substitute placeholders
      const substitutionResult = substitution.substituteDocument(parseResult, data, xmlFiles);

      expect(substitutionResult.success).toBe(true);
      expect(substitutionResult.stats.totalSubstitutions).toBeGreaterThanOrEqual(5);
      expect(substitutionResult.stats.failedSubstitutions).toBe(0);

      // Verify document content substitution
      const documentFile = substitutionResult.modifiedFiles.get('word/document.xml');
      expect(documentFile).toBeDefined();
      expect(documentFile.modified).toBe(true);
      expect(documentFile.content).toContain('Dear John Smith');
      expect(documentFile.content).toContain('ORD-12345');
      expect(documentFile.content).toContain('299.99');

      // Verify page 2 was deleted (should not contain Optional Notes Section)
      expect(documentFile.content).not.toContain('Optional Notes Section');
      expect(substitutionResult.stats.deletedElements).toBeGreaterThan(0);

      // Verify chart content substitution
      const chartFile = substitutionResult.modifiedFiles.get('word/charts/chart1.xml');
      expect(chartFile).toBeDefined();
      expect(chartFile.modified).toBe(true);
      expect(chartFile.content).toContain('125000');
      expect(chartFile.content).toContain('150000');
    });

    test('should handle partial data gracefully', () => {
      const xmlFiles = [
        {
          path: 'test.xml',
          type: 'word',
          category: 'content',
          content: `
            <document>
              <text>Available: (((user.name)))</text>
              <text>Missing: (((user.missing)))</text>
              <text>Nested missing: (((user.profile.bio)))</text>
            </document>
          `,
        },
      ];

      const data = {
        user: {
          name: 'John Doe',
          profile: {}, // Empty profile object
        },
      };

      // Configure to preserve unmatched placeholders
      substitution.configure({
        strictMode: false,
        preserveUnmatched: true,
        logMissingData: false, // Disable warnings for test
      });

      const parseResult = parser.parseDocument({}, xmlFiles);
      const substitutionResult = substitution.substituteDocument(parseResult, data, xmlFiles);

      expect(substitutionResult.success).toBe(true);
      expect(substitutionResult.stats.successfulSubstitutions).toBe(1);
      expect(substitutionResult.stats.failedSubstitutions).toBe(2);

      const file = substitutionResult.modifiedFiles.get('test.xml');
      expect(file.content).toContain('Available: John Doe');
      expect(file.content).toContain('Missing: (((user.missing)))'); // Preserved
      expect(file.content).toContain('Nested missing: (((user.profile.bio)))'); // Preserved
    });

    test('should handle complex delete directives', () => {
      const xmlFiles = [
        {
          path: 'slides.xml',
          type: 'powerpoint',
          category: 'content',
          content: `
            <slides>
              <slide>
                <title>Main Content</title>
                <content>(((main.content)))</content>
              </slide>
              <slide>
                <title>Optional Slide</title>
                <content>(((DeleteSlideIfEmpty=optional.slide)))</content>
              </slide>
              <slide>
                <title>Another Optional</title>
                <content>(((DeleteSlideIfEmpty=optional.another)))</content>
              </slide>
            </slides>
          `,
        },
      ];

      const data = {
        main: {
          content: 'This is the main content that should always appear.',
        },
        optional: {
          slide: '', // Empty - should delete
          another: 'This has content', // Not empty - should keep
        },
      };

      const parseResult = parser.parseDocument({}, xmlFiles);
      const substitutionResult = substitution.substituteDocument(parseResult, data, xmlFiles, {
        deleteEmptyElements: true,
      });

      expect(substitutionResult.success).toBe(true);
      expect(substitutionResult.stats.deletedElements).toBe(1);

      const file = substitutionResult.modifiedFiles.get('slides.xml');
      expect(file.content).toContain('This is the main content');
      expect(file.content).toContain('<content></content>'); // Empty from delete directive
      expect(file.content).toContain('This has content'); // Preserved
    });

    test('should validate data requirements', () => {
      const xmlFiles = [
        {
          path: 'test.xml',
          type: 'other',
          category: 'content',
          content: `
            <doc>
              <text>(((user.name)))</text>
              <text>(((user.email)))</text>
              <chart>(((123456=sales.total)))</chart>
              <optional>(((DeletePageIfEmpty=optional.content)))</optional>
            </doc>
          `,
        },
      ];

      const parseResult = parser.parseDocument({}, xmlFiles);

      // Test with complete data
      const completeData = {
        user: { name: 'John', email: 'john@example.com' },
        sales: { total: 125000 },
        optional: { content: 'Some content' },
      };

      const completeValidation = substitution.validateData(parseResult, completeData);
      expect(completeValidation.valid).toBe(true);
      expect(completeValidation.coverage).toBe(100);
      expect(completeValidation.missing).toEqual([]);

      // Test with incomplete data
      const incompleteData = {
        user: { name: 'John' }, // Missing email
        sales: { total: 'not-a-number' }, // Wrong type
      };

      const incompleteValidation = substitution.validateData(parseResult, incompleteData);
      expect(incompleteValidation.valid).toBe(false);
      expect(incompleteValidation.missing).toContain('user.email');
      expect(incompleteValidation.missing).toContain('optional.content');
      expect(incompleteValidation.typeErrors).toHaveLength(1);
      expect(incompleteValidation.typeErrors[0].placeholder).toBe('sales.total');
    });
  });

  describe('Performance and Scalability', () => {
    test('should handle large documents efficiently', () => {
      // Create a large document with many placeholders
      const placeholderCount = 1000;
      let content = '<document>';
      const expectedData = {};

      for (let i = 0; i < placeholderCount; i++) {
        content += `<item id="${i}">Value: (((item.${i})))</item>`;
        expectedData[`item`] = expectedData[`item`] || {};
        expectedData[`item`][i.toString()] = `Value ${i}`;
      }
      content += '</document>';

      const xmlFiles = [
        {
          path: 'large.xml',
          type: 'other',
          category: 'content',
          content,
        },
      ];

      const startTime = Date.now();

      const parseResult = parser.parseDocument({}, xmlFiles);
      expect(parseResult.summary.totalPlaceholders).toBe(placeholderCount);

      const substitutionResult = substitution.substituteDocument(
        parseResult,
        expectedData,
        xmlFiles
      );
      expect(substitutionResult.success).toBe(true);
      expect(substitutionResult.stats.successfulSubstitutions).toBe(placeholderCount);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete in reasonable time (under 2 seconds for 1000 placeholders)
      expect(duration).toBeLessThan(2000);

      // Verify some random substitutions worked
      const file = substitutionResult.modifiedFiles.get('large.xml');
      expect(file.content).toContain('Value: Value 0');
      expect(file.content).toContain('Value: Value 999');
    });
  });
});
