/**
 * Integration tests for substituteTemplate method with realistic workflows
 */

const OOXMLTemplater = require('../../src/index');
const path = require('path');
const fs = require('fs').promises;
const AdmZip = require('adm-zip');

describe('substituteTemplate Integration Tests', () => {
  let templater;
  // const fixturesDir = path.join(__dirname, '../fixtures');
  const testTemplatesDir = path.join(__dirname, '../fixtures/substitution-templates');

  beforeAll(async () => {
    await fs.mkdir(testTemplatesDir, { recursive: true });
  });

  beforeEach(() => {
    templater = new OOXMLTemplater();
  });

  afterAll(async () => {
    try {
      const files = await fs.readdir(testTemplatesDir);
      for (const file of files) {
        await fs.unlink(path.join(testTemplatesDir, file));
      }
      await fs.rmdir(testTemplatesDir);
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('Word Document (.docx) Substitution', () => {
    let docxTemplatePath;

    beforeAll(async () => {
      const zip = new AdmZip();

      zip.addFile('[Content_Types].xml', Buffer.from(`<?xml version="1.0"?><Types></Types>`));

      zip.addFile(
        'word/document.xml',
        Buffer.from(`<?xml version="1.0"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:t>Invoice for (((customer.name)))</w:t></w:r></w:p>
    <w:p><w:r><w:t>Order #(((order.id)))</w:t></w:r></w:p>
    <w:p><w:r><w:t>Total: $(((order.total)))</w:t></w:r></w:p>
    <w:p><w:r><w:t>Email: (((customer.email)))</w:t></w:r></w:p>
  </w:body>
</w:document>`)
      );

      docxTemplatePath = path.join(testTemplatesDir, 'invoice.docx');
      await fs.writeFile(docxTemplatePath, zip.toBuffer());
    });

    test('should substitute all placeholders correctly', async () => {
      const data = {
        customer: {
          name: 'John Doe',
          email: 'john@example.com',
        },
        order: {
          id: 'ORD-12345',
          total: '99.99',
        },
      };

      const result = await templater.substituteTemplate(docxTemplatePath, data);

      expect(result.success).toBe(true);
      expect(result.document).toBeInstanceOf(Buffer);

      // Extract and verify the modified document
      const outputZip = new AdmZip(result.document);
      const documentXml = outputZip.readAsText('word/document.xml');

      expect(documentXml).toContain('John Doe');
      expect(documentXml).toContain('john@example.com');
      expect(documentXml).toContain('ORD-12345');
      expect(documentXml).toContain('99.99');

      // Should not contain any placeholders
      expect(documentXml).not.toContain('(((customer.name)))');
      expect(documentXml).not.toContain('(((order.id)))');
    });

    test('should provide accurate statistics', async () => {
      const data = {
        customer: { name: 'Jane Smith', email: 'jane@example.com' },
        order: { id: 'ORD-67890', total: '150.00' },
      };

      const result = await templater.substituteTemplate(docxTemplatePath, data);

      expect(result.substitution.stats).toBeDefined();
      expect(result.substitution.stats.successfulSubstitutions).toBe(4);
      expect(result.substitution.stats.totalSubstitutions).toBe(4);
      expect(result.substitution.stats.failedSubstitutions).toBe(0);
    });

    test('should preserve document structure', async () => {
      const data = {
        customer: { name: 'Test User', email: 'test@example.com' },
        order: { id: 'TEST-001', total: '50.00' },
      };

      const result = await templater.substituteTemplate(docxTemplatePath, data);

      // Verify ZIP structure is intact
      const outputZip = new AdmZip(result.document);
      const entries = outputZip.getEntries();

      expect(entries.find((e) => e.entryName === '[Content_Types].xml')).toBeDefined();
      expect(entries.find((e) => e.entryName === 'word/document.xml')).toBeDefined();
    });
  });

  describe('PowerPoint Presentation (.pptx) Substitution', () => {
    let pptxTemplatePath;

    beforeAll(async () => {
      const zip = new AdmZip();

      zip.addFile('[Content_Types].xml', Buffer.from(`<?xml version="1.0"?><Types></Types>`));

      zip.addFile(
        'ppt/slides/slide1.xml',
        Buffer.from(`<?xml version="1.0"?>
<p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:spTree>
      <p:sp>
        <p:txBody>
          <a:p><a:r><a:t>Q4 Report - (((report.quarter)))</a:t></a:r></a:p>
          <a:p><a:r><a:t>Revenue: $(((report.revenue)))</a:t></a:r></a:p>
          <a:p><a:r><a:t>Prepared by: (((report.author)))</a:t></a:r></a:p>
          <a:p><a:r><a:t>Chart directives: (((50000=data.q1))) (((75000=data.q2))) (((60000=data.q3))) (((90000=data.q4)))</a:t></a:r></a:p>
        </p:txBody>
      </p:sp>
    </p:spTree>
  </p:cSld>
</p:sld>`)
      );

      zip.addFile(
        'ppt/charts/chart1.xml',
        Buffer.from(`<?xml version="1.0"?>
<c:chartSpace xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart">
  <c:chart>
    <c:plotArea>
      <c:barChart>
        <c:ser>
          <c:val>
            <c:numRef>
              <c:numCache>
                <c:pt idx="0"><c:v>50000</c:v></c:pt>
                <c:pt idx="1"><c:v>75000</c:v></c:pt>
                <c:pt idx="2"><c:v>60000</c:v></c:pt>
                <c:pt idx="3"><c:v>90000</c:v></c:pt>
              </c:numCache>
            </c:numRef>
          </c:val>
        </c:ser>
      </c:barChart>
    </c:plotArea>
  </c:chart>
</c:chartSpace>`)
      );

      pptxTemplatePath = path.join(testTemplatesDir, 'quarterly-report.pptx');
      await fs.writeFile(pptxTemplatePath, zip.toBuffer());
    });

    test('should substitute text placeholders', async () => {
      const data = {
        report: {
          quarter: 'Q4 2025',
          revenue: '1,250,000',
          author: 'Finance Team',
        },
      };

      const result = await templater.substituteTemplate(pptxTemplatePath, data);

      expect(result.success).toBe(true);

      const outputZip = new AdmZip(result.document);
      const slideXml = outputZip.readAsText('ppt/slides/slide1.xml');

      expect(slideXml).toContain('Q4 2025');
      expect(slideXml).toContain('1,250,000');
      expect(slideXml).toContain('Finance Team');
    });

    test('should substitute numeric directives in charts', async () => {
      const data = {
        report: {
          quarter: 'Q4 2025',
          revenue: '1,000,000',
          author: 'Team',
        },
        data: {
          q1: 55000,
          q2: 78000,
          q3: 62000,
          q4: 95000,
        },
      };

      const result = await templater.substituteTemplate(pptxTemplatePath, data);

      expect(result.success).toBe(true);

      const outputZip = new AdmZip(result.document);
      const chartXml = outputZip.readAsText('ppt/charts/chart1.xml');

      expect(chartXml).toContain('55000');
      expect(chartXml).toContain('78000');
      expect(chartXml).toContain('62000');
      expect(chartXml).toContain('95000');

      // Original numbers should be replaced
      expect(chartXml).not.toContain('50000');
      expect(chartXml).not.toContain('75000');
    });
  });

  describe('Excel Spreadsheet (.xlsx) Substitution', () => {
    let xlsxTemplatePath;

    beforeAll(async () => {
      const zip = new AdmZip();

      zip.addFile('[Content_Types].xml', Buffer.from(`<?xml version="1.0"?><Types></Types>`));

      zip.addFile(
        'xl/worksheets/sheet1.xml',
        Buffer.from(`<?xml version="1.0"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>
    <row r="1">
      <c r="A1" t="inlineStr"><is><t>(((product.name)))</t></is></c>
      <c r="B1" t="inlineStr"><is><t>(((product.sku)))</t></is></c>
    </row>
    <row r="2">
      <c r="A2" t="inlineStr"><is><t>Price:</t></is></c>
      <c r="B2" t="inlineStr"><is><t>$(((product.price)))</t></is></c>
    </row>
    <row r="3">
      <c r="A3" t="inlineStr"><is><t>Stock:</t></is></c>
      <c r="B3" t="inlineStr"><is><t>(((product.stock)))</t></is></c>
    </row>
  </sheetData>
</worksheet>`)
      );

      xlsxTemplatePath = path.join(testTemplatesDir, 'inventory.xlsx');
      await fs.writeFile(xlsxTemplatePath, zip.toBuffer());
    });

    test('should substitute placeholders in worksheet', async () => {
      const data = {
        product: {
          name: 'Premium Widget',
          sku: 'WDG-PRO-001',
          price: '49.99',
          stock: '150',
        },
      };

      const result = await templater.substituteTemplate(xlsxTemplatePath, data);

      expect(result.success).toBe(true);

      const outputZip = new AdmZip(result.document);
      const sheetXml = outputZip.readAsText('xl/worksheets/sheet1.xml');

      expect(sheetXml).toContain('Premium Widget');
      expect(sheetXml).toContain('WDG-PRO-001');
      expect(sheetXml).toContain('49.99');
      expect(sheetXml).toContain('150');
    });
  });

  describe('Error Handling', () => {
    test('should handle missing template file', async () => {
      const data = { test: 'value' };
      const result = await templater.substituteTemplate('/non/existent/file.docx', data);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error.message).toBeDefined();
    });

    test('should handle invalid template format', async () => {
      const invalidPath = path.join(testTemplatesDir, 'invalid.docx');
      await fs.writeFile(invalidPath, Buffer.from('Not a valid ZIP file'));

      const data = { test: 'value' };
      const result = await templater.substituteTemplate(invalidPath, data);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();

      await fs.unlink(invalidPath);
    });

    test('should handle missing data in non-strict mode', async () => {
      const zip = new AdmZip();
      zip.addFile('[Content_Types].xml', Buffer.from('<?xml version="1.0"?><Types></Types>'));
      zip.addFile(
        'word/document.xml',
        Buffer.from(`<?xml version="1.0"?>
<document><p>Hello (((user.name))), email: (((user.email)))</p></document>`)
      );

      const tempPath = path.join(testTemplatesDir, 'partial-data-test.docx');
      await fs.writeFile(tempPath, zip.toBuffer());

      const data = {
        user: {
          name: 'Alice',
          // email is missing
        },
      };

      const result = await templater.substituteTemplate(tempPath, data, {
        strictMode: false,
        logMissingData: false,
      });

      expect(result.success).toBe(true);
      expect(result.document).toBeDefined();
    });
  });

  describe('Substitution Options', () => {
    let optionsTemplatePath;

    beforeAll(async () => {
      const zip = new AdmZip();
      zip.addFile('[Content_Types].xml', Buffer.from('<?xml version="1.0"?><Types></Types>'));
      zip.addFile(
        'word/document.xml',
        Buffer.from(`<?xml version="1.0"?>
<document><p>Name: (((user.name))), Age: (((user.age))), City: (((user.city)))</p></document>`)
      );

      optionsTemplatePath = path.join(testTemplatesDir, 'options-test.docx');
      await fs.writeFile(optionsTemplatePath, zip.toBuffer());
    });

    test('should preserve unmatched placeholders when preserveUnmatched is true', async () => {
      const data = {
        user: {
          name: 'Bob',
          age: '30',
          // city is missing
        },
      };

      const result = await templater.substituteTemplate(optionsTemplatePath, data, {
        preserveUnmatched: true,
        logMissingData: false,
      });

      expect(result.success).toBe(true);

      const outputZip = new AdmZip(result.document);
      const documentXml = outputZip.readAsText('word/document.xml');

      expect(documentXml).toContain('Bob');
      expect(documentXml).toContain('30');
      expect(documentXml).toContain('(((user.city)))'); // Should preserve
    });

    test('should remove unmatched placeholders when preserveUnmatched is false', async () => {
      const data = {
        user: {
          name: 'Carol',
          age: '25',
          // city is missing
        },
      };

      const result = await templater.substituteTemplate(optionsTemplatePath, data, {
        preserveUnmatched: false,
        logMissingData: false,
      });

      expect(result.success).toBe(true);

      const outputZip = new AdmZip(result.document);
      const documentXml = outputZip.readAsText('word/document.xml');

      expect(documentXml).toContain('Carol');
      expect(documentXml).toContain('25');
      expect(documentXml).not.toContain('(((user.city)))'); // Should be removed
    });
  });

  describe('End-to-End Workflow', () => {
    test('should complete full parse-substitute workflow', async () => {
      // Create template
      const zip = new AdmZip();
      zip.addFile('[Content_Types].xml', Buffer.from('<?xml version="1.0"?><Types></Types>'));
      zip.addFile(
        'word/document.xml',
        Buffer.from(`<?xml version="1.0"?>
<document><p>Report by (((author))), Date: (((date)))</p></document>`)
      );

      const templatePath = path.join(testTemplatesDir, 'e2e-test.docx');
      await fs.writeFile(templatePath, zip.toBuffer());

      // Step 1: Parse template to get placeholders
      const parseResult = await templater.parseTemplate(templatePath);
      expect(parseResult.success).toBe(true);
      expect(parseResult.placeholders.unique).toContain('author');
      expect(parseResult.placeholders.unique).toContain('date');

      // Step 2: Substitute with data
      const data = {
        author: 'Alice Johnson',
        date: '2025-10-03',
      };

      const substituteResult = await templater.substituteTemplate(templatePath, data);
      expect(substituteResult.success).toBe(true);

      // Step 3: Verify output
      const outputZip = new AdmZip(substituteResult.document);
      const documentXml = outputZip.readAsText('word/document.xml');

      expect(documentXml).toContain('Alice Johnson');
      expect(documentXml).toContain('2025-10-03');
      expect(documentXml).not.toContain('(((author)))');
      expect(documentXml).not.toContain('(((date)))');
    });
  });
});
