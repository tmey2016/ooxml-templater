/**
 * Integration tests for complete processTemplate workflow
 */

const OOXMLTemplater = require('../../src/index');
const path = require('path');
const fs = require('fs').promises;
const AdmZip = require('adm-zip');

describe('processTemplate Integration Tests', () => {
  let templater;
  const testTemplatesDir = path.join(__dirname, '../fixtures/process-templates');
  const outputDir = path.join(__dirname, '../fixtures/process-output');

  beforeAll(async () => {
    await fs.mkdir(testTemplatesDir, { recursive: true });
    await fs.mkdir(outputDir, { recursive: true });
  });

  beforeEach(() => {
    templater = new OOXMLTemplater();
  });

  afterAll(async () => {
    try {
      // Cleanup test templates
      const templateFiles = await fs.readdir(testTemplatesDir);
      for (const file of templateFiles) {
        await fs.unlink(path.join(testTemplatesDir, file));
      }
      await fs.rmdir(testTemplatesDir);

      // Cleanup output files
      const outputFiles = await fs.readdir(outputDir);
      for (const file of outputFiles) {
        await fs.unlink(path.join(outputDir, file));
      }
      await fs.rmdir(outputDir);
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('End-to-End Workflow with Data Object', () => {
    let templatePath;

    beforeAll(async () => {
      const zip = new AdmZip();
      zip.addFile('[Content_Types].xml', Buffer.from('<?xml version="1.0"?><Types></Types>'));
      zip.addFile('word/document.xml', Buffer.from(`<?xml version="1.0"?>
<document>
  <p>Invoice #(((invoice.number)))</p>
  <p>Customer: (((customer.name)))</p>
  <p>Email: (((customer.email)))</p>
  <p>Total: $(((invoice.total)))</p>
  <p>Date: (((invoice.date)))</p>
</document>`));

      templatePath = path.join(testTemplatesDir, 'invoice.docx');
      await fs.writeFile(templatePath, zip.toBuffer());
    });

    test('should complete full workflow with data object', async () => {
      const data = {
        invoice: {
          number: 'INV-2025-001',
          total: '1,250.50',
          date: '2025-10-03',
        },
        customer: {
          name: 'Acme Corporation',
          email: 'billing@acme.com',
        },
      };

      const result = await templater.processTemplate(templatePath, data);

      expect(result.success).toBe(true);
      expect(result.document).toBeInstanceOf(Buffer);
      expect(result.template).toBeDefined();
      expect(result.parsing).toBeDefined();
      expect(result.substitution).toBeDefined();
      expect(result.metadata).toBeDefined();
    });

    test('should verify substituted content', async () => {
      const data = {
        invoice: { number: 'TEST-001', total: '99.99', date: '2025-01-01' },
        customer: { name: 'Test User', email: 'test@test.com' },
      };

      const result = await templater.processTemplate(templatePath, data);

      expect(result.success).toBe(true);

      // Extract and verify content
      const outputZip = new AdmZip(result.document);
      const documentXml = outputZip.readAsText('word/document.xml');

      expect(documentXml).toContain('TEST-001');
      expect(documentXml).toContain('Test User');
      expect(documentXml).toContain('test@test.com');
      expect(documentXml).toContain('99.99');
      expect(documentXml).not.toContain('(((invoice.number)))');
    });

    test('should include parsing statistics', async () => {
      const data = {
        invoice: { number: 'STAT-001', total: '100', date: '2025-01-01' },
        customer: { name: 'Stats', email: 'stats@test.com' },
      };

      const result = await templater.processTemplate(templatePath, data);

      expect(result.parsing.placeholders).toBeDefined();
      expect(result.parsing.statistics).toBeDefined();
      expect(result.parsing.statistics.uniquePlaceholders).toBe(5);
      expect(result.parsing.placeholders.unique).toHaveLength(5);
    });

    test('should include substitution statistics', async () => {
      const data = {
        invoice: { number: 'SUB-001', total: '200', date: '2025-01-01' },
        customer: { name: 'Sub Test', email: 'sub@test.com' },
      };

      const result = await templater.processTemplate(templatePath, data);

      expect(result.substitution.stats).toBeDefined();
      expect(result.substitution.stats.successfulSubstitutions).toBe(5);
      expect(result.substitution.stats.totalSubstitutions).toBe(5);
      expect(result.substitution.stats.failedSubstitutions).toBe(0);
    });
  });

  describe('Saving to File System', () => {
    let templatePath;

    beforeAll(async () => {
      const zip = new AdmZip();
      zip.addFile('[Content_Types].xml', Buffer.from('<?xml version="1.0"?><Types></Types>'));
      zip.addFile('word/document.xml', Buffer.from(`<?xml version="1.0"?>
<document><p>Report: (((report.title)))</p><p>Author: (((report.author)))</p></document>`));

      templatePath = path.join(testTemplatesDir, 'report.docx');
      await fs.writeFile(templatePath, zip.toBuffer());
    });

    test('should save processed document to file', async () => {
      const data = {
        report: {
          title: 'Q4 Financial Report',
          author: 'Finance Department',
        },
      };

      const outputPath = path.join(outputDir, 'q4-report.docx');

      const result = await templater.processTemplate(templatePath, data, {
        outputPath: outputPath,
      });

      expect(result.success).toBe(true);
      expect(result.output.success).toBe(true);
      expect(result.output.path).toBe(outputPath);

      // Verify file exists
      const stats = await fs.stat(outputPath);
      expect(stats.isFile()).toBe(true);
      expect(stats.size).toBeGreaterThan(0);

      // Verify content
      const fileBuffer = await fs.readFile(outputPath);
      const zip = new AdmZip(fileBuffer);
      const documentXml = zip.readAsText('word/document.xml');

      expect(documentXml).toContain('Q4 Financial Report');
      expect(documentXml).toContain('Finance Department');
    });

    test('should create output directory if it does not exist', async () => {
      const data = {
        report: {
          title: 'New Report',
          author: 'New Author',
        },
      };

      const outputPath = path.join(outputDir, 'new-dir', 'report.docx');

      const result = await templater.processTemplate(templatePath, data, {
        outputPath: outputPath,
      });

      expect(result.success).toBe(true);
      expect(result.output.success).toBe(true);

      // Verify file exists
      const stats = await fs.stat(outputPath);
      expect(stats.isFile()).toBe(true);

      // Cleanup
      await fs.unlink(outputPath);
      await fs.rmdir(path.dirname(outputPath));
    });

    test('should return output metadata', async () => {
      const data = {
        report: { title: 'Metadata Report', author: 'Metadata Author' },
      };

      const outputPath = path.join(outputDir, 'metadata-report.docx');

      const result = await templater.processTemplate(templatePath, data, {
        outputPath: outputPath,
      });

      expect(result.output.metadata).toBeDefined();
      expect(result.output.metadata.savedAt).toBeDefined();
      expect(result.output.metadata.absolutePath).toBeDefined();
      expect(result.output.filename).toBe('metadata-report.docx');
    });
  });

  describe('Buffer Output Mode', () => {
    let templatePath;

    beforeAll(async () => {
      const zip = new AdmZip();
      zip.addFile('[Content_Types].xml', Buffer.from('<?xml version="1.0"?><Types></Types>'));
      zip.addFile('word/document.xml', Buffer.from(`<?xml version="1.0"?>
<document><p>Data: (((test.value)))</p></document>`));

      templatePath = path.join(testTemplatesDir, 'buffer-test.docx');
      await fs.writeFile(templatePath, zip.toBuffer());
    });

    test('should return buffer when no output options specified', async () => {
      const data = {
        test: { value: 'Buffer Test' },
      };

      const result = await templater.processTemplate(templatePath, data);

      expect(result.success).toBe(true);
      expect(result.output.type).toBe('buffer');
      expect(result.document).toBeInstanceOf(Buffer);

      // Verify buffer is valid ZIP
      expect(result.document[0]).toBe(0x50); // 'P'
      expect(result.document[1]).toBe(0x4b); // 'K'
    });

    test('should allow manual saving of returned buffer', async () => {
      const data = {
        test: { value: 'Manual Save Test' },
      };

      const result = await templater.processTemplate(templatePath, data);

      expect(result.success).toBe(true);

      // Manually save the buffer
      const manualPath = path.join(outputDir, 'manual-save.docx');
      await fs.writeFile(manualPath, result.document);

      // Verify file
      const stats = await fs.stat(manualPath);
      expect(stats.isFile()).toBe(true);
    });
  });

  describe('Custom Options', () => {
    let templatePath;

    beforeAll(async () => {
      const zip = new AdmZip();
      zip.addFile('[Content_Types].xml', Buffer.from('<?xml version="1.0"?><Types></Types>'));
      zip.addFile('word/document.xml', Buffer.from(`<?xml version="1.0"?>
<document><p>Name: (((user.name)))</p><p>Age: (((user.age)))</p><p>City: (((user.city)))</p></document>`));

      templatePath = path.join(testTemplatesDir, 'options-test.docx');
      await fs.writeFile(templatePath, zip.toBuffer());
    });

    test('should support custom filename', async () => {
      const data = {
        user: { name: 'John', age: '30', city: 'NYC' },
      };

      const result = await templater.processTemplate(templatePath, data, {
        filename: 'custom-filename.docx',
      });

      expect(result.success).toBe(true);
    });

    test('should pass substitution options', async () => {
      const data = {
        user: { name: 'Alice', age: '25' },
        // city is missing
      };

      const result = await templater.processTemplate(templatePath, data, {
        substitutionOptions: {
          preserveUnmatched: true,
          logMissingData: false,
        },
      });

      expect(result.success).toBe(true);

      // Verify unmatched placeholder was preserved
      const zip = new AdmZip(result.document);
      const documentXml = zip.readAsText('word/document.xml');
      expect(documentXml).toContain('(((user.city)))');
    });
  });

  describe('Error Handling', () => {
    test('should handle template not found', async () => {
      const data = { test: 'value' };
      const result = await templater.processTemplate('/non/existent/template.docx', data);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error.message).toContain('parsing failed');
    });

    test('should handle invalid template format', async () => {
      const invalidPath = path.join(testTemplatesDir, 'invalid.docx');
      await fs.writeFile(invalidPath, Buffer.from('Not a valid ZIP'));

      const data = { test: 'value' };
      const result = await templater.processTemplate(invalidPath, data);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Complex Real-World Scenarios', () => {
    let complexTemplatePath;

    beforeAll(async () => {
      const zip = new AdmZip();
      zip.addFile('[Content_Types].xml', Buffer.from('<?xml version="1.0"?><Types></Types>'));

      // Main document
      zip.addFile('word/document.xml', Buffer.from(`<?xml version="1.0"?>
<document>
  <p>Contract Agreement</p>
  <p>Party A: (((contract.partyA)))</p>
  <p>Party B: (((contract.partyB)))</p>
  <p>Effective Date: (((contract.effectiveDate)))</p>
  <p>Amount: $(((contract.amount)))</p>
  <p>Terms: (((contract.terms)))</p>
</document>`));

      // Header
      zip.addFile('word/header1.xml', Buffer.from(`<?xml version="1.0"?>
<header><p>Contract #(((contract.number)))</p></header>`));

      complexTemplatePath = path.join(testTemplatesDir, 'contract.docx');
      await fs.writeFile(complexTemplatePath, zip.toBuffer());
    });

    test('should process complex multi-file template', async () => {
      const data = {
        contract: {
          number: 'CTR-2025-001',
          partyA: 'Company A Inc.',
          partyB: 'Company B LLC',
          effectiveDate: '2025-10-03',
          amount: '500,000',
          terms: '12 months',
        },
      };

      const outputPath = path.join(outputDir, 'contract-processed.docx');

      const result = await templater.processTemplate(complexTemplatePath, data, {
        outputPath: outputPath,
      });

      expect(result.success).toBe(true);

      // Verify all files were processed
      const zip = new AdmZip(result.document);
      const documentXml = zip.readAsText('word/document.xml');
      const headerXml = zip.readAsText('word/header1.xml');

      expect(documentXml).toContain('Company A Inc.');
      expect(documentXml).toContain('Company B LLC');
      expect(documentXml).toContain('500,000');

      expect(headerXml).toContain('CTR-2025-001');

      // Verify statistics
      expect(result.parsing.statistics.uniquePlaceholders).toBe(6);
      // Successful substitutions may be less if delete directives removed content
      expect(result.substitution.stats.successfulSubstitutions).toBeGreaterThanOrEqual(6);
    });
  });
});
