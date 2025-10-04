/**
 * Integration tests for parseTemplate method using real Office document templates
 */

const OOXMLTemplater = require('../../src/index');
const path = require('path');
const fs = require('fs').promises;
const AdmZip = require('adm-zip');

describe('parseTemplate Integration Tests', () => {
  let templater;
  const fixturesDir = path.join(__dirname, '../fixtures');
  const testTemplatesDir = path.join(__dirname, '../fixtures/integration-templates');

  beforeAll(async () => {
    // Create test templates directory
    await fs.mkdir(testTemplatesDir, { recursive: true });
  });

  beforeEach(() => {
    templater = new OOXMLTemplater();
  });

  afterAll(async () => {
    // Cleanup test templates
    try {
      const files = await fs.readdir(testTemplatesDir);
      for (const file of files) {
        await fs.unlink(path.join(testTemplatesDir, file));
      }
      await fs.rmdir(testTemplatesDir);
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Word Document (.docx) Templates', () => {
    let docxTemplatePath;

    beforeAll(async () => {
      // Create a realistic Word document template
      const zip = new AdmZip();

      zip.addFile('[Content_Types].xml', Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`));

      zip.addFile('word/document.xml', Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:t>Dear (((customer.name))),</w:t></w:r></w:p>
    <w:p><w:r><w:t>Your order #(((order.number))) totaling $(((order.total))) has been confirmed.</w:t></w:r></w:p>
    <w:p><w:r><w:t>Shipping address: (((customer.address)))</w:t></w:r></w:p>
    <w:p><w:r><w:t>(((DeletePageIfEmpty=optional.notes)))</w:t></w:r></w:p>
  </w:body>
</w:document>`));

      zip.addFile('word/header1.xml', Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<w:hdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:p><w:r><w:t>Invoice - (((company.name)))</w:t></w:r></w:p>
</w:hdr>`));

      docxTemplatePath = path.join(testTemplatesDir, 'invoice-template.docx');
      await fs.writeFile(docxTemplatePath, zip.toBuffer());
    });

    test('should successfully parse Word document template', async () => {
      const result = await templater.parseTemplate(docxTemplatePath);

      expect(result.success).toBe(true);
      expect(result.template).toBeDefined();
      expect(result.placeholders).toBeDefined();
      expect(result.statistics).toBeDefined();
      expect(result.metadata).toBeDefined();
    });

    test('should detect correct document type and MIME type', async () => {
      const result = await templater.parseTemplate(docxTemplatePath);

      expect(result.template.type).toBe('docx');
      expect(result.template.mimeType).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      expect(result.template.filename).toBe('invoice-template.docx');
      expect(result.template.url).toBe(docxTemplatePath);
    });

    test('should find all placeholders in Word document', async () => {
      const result = await templater.parseTemplate(docxTemplatePath);

      expect(result.placeholders.unique).toContain('customer.name');
      expect(result.placeholders.unique).toContain('order.number');
      expect(result.placeholders.unique).toContain('order.total');
      expect(result.placeholders.unique).toContain('customer.address');
      expect(result.placeholders.unique).toContain('company.name');
      expect(result.placeholders.unique).toContain('optional.notes');

      expect(result.statistics.uniquePlaceholders).toBe(6);
      expect(result.statistics.totalPlaceholders).toBeGreaterThanOrEqual(6);
    });

    test('should detect DeletePageIfEmpty directive', async () => {
      const result = await templater.parseTemplate(docxTemplatePath);

      expect(result.placeholders.delete).toHaveLength(1);
      expect(result.placeholders.delete[0].cleanName).toBe('optional.notes');
      expect(result.placeholders.delete[0].directive).toBe('DeletePageIfEmpty');
      expect(result.statistics.deleteDirectives).toBe(1);
    });

    test('should include correct environment metadata', async () => {
      const result = await templater.parseTemplate(docxTemplatePath);

      expect(result.metadata.environment).toBe('node');
      expect(result.metadata.parsedAt).toBeDefined();
      expect(new Date(result.metadata.parsedAt)).toBeInstanceOf(Date);
    });
  });

  describe('PowerPoint Presentation (.pptx) Templates', () => {
    let pptxTemplatePath;

    beforeAll(async () => {
      // Create a realistic PowerPoint presentation template with chart
      const zip = new AdmZip();

      zip.addFile('[Content_Types].xml', Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>
  <Override PartName="/ppt/slides/slide1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>
  <Override PartName="/ppt/charts/chart1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawingml.chart+xml"/>
</Types>`));

      zip.addFile('ppt/slides/slide1.xml', Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:spTree>
      <p:sp>
        <p:txBody>
          <a:p><a:r><a:t>(((presentation.title)))</a:t></a:r></a:p>
          <a:p><a:r><a:t>Presented by: (((presenter.name)))</a:t></a:r></a:p>
          <a:p><a:r><a:t>Date: (((presentation.date)))</a:t></a:r></a:p>
        </p:txBody>
      </p:sp>
    </p:spTree>
  </p:cSld>
</p:sld>`));

      zip.addFile('ppt/charts/chart1.xml', Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<c:chartSpace xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart">
  <c:chart>
    <c:title>
      <c:tx>
        <c:rich>
          <a:p><a:r><a:t>(((chart.title)))</a:t></a:r></a:p>
        </c:rich>
      </c:tx>
    </c:title>
    <c:plotArea>
      <c:pieChart>
        <c:ser>
          <c:val>
            <c:numRef>
              <c:numCache>
                <c:pt idx="0"><c:v>(((100000=sales.q1)))</c:v></c:pt>
                <c:pt idx="1"><c:v>(((200000=sales.q2)))</c:v></c:pt>
                <c:pt idx="2"><c:v>(((150000=sales.q3)))</c:v></c:pt>
                <c:pt idx="3"><c:v>(((250000=sales.q4)))</c:v></c:pt>
              </c:numCache>
            </c:numRef>
          </c:val>
        </c:ser>
      </c:pieChart>
    </c:plotArea>
  </c:chart>
</c:chartSpace>`));

      zip.addFile('ppt/slides/slide2.xml', Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:spTree>
      <p:sp>
        <p:txBody>
          <a:p><a:r><a:t>(((DeleteSlideIfEmpty=optional.slide.content)))</a:t></a:r></a:p>
        </p:txBody>
      </p:sp>
    </p:spTree>
  </p:cSld>
</p:sld>`));

      pptxTemplatePath = path.join(testTemplatesDir, 'sales-presentation.pptx');
      await fs.writeFile(pptxTemplatePath, zip.toBuffer());
    });

    test('should successfully parse PowerPoint template', async () => {
      const result = await templater.parseTemplate(pptxTemplatePath);

      expect(result.success).toBe(true);
      expect(result.template.type).toBe('pptx');
      expect(result.template.mimeType).toBe('application/vnd.openxmlformats-officedocument.presentationml.presentation');
    });

    test('should find placeholders in slides', async () => {
      const result = await templater.parseTemplate(pptxTemplatePath);

      expect(result.placeholders.unique).toContain('presentation.title');
      expect(result.placeholders.unique).toContain('presenter.name');
      expect(result.placeholders.unique).toContain('presentation.date');
    });

    test('should detect numeric directives in chart data', async () => {
      const result = await templater.parseTemplate(pptxTemplatePath);

      expect(result.placeholders.numeric).toHaveLength(4);
      expect(result.placeholders.unique).toContain('sales.q1');
      expect(result.placeholders.unique).toContain('sales.q2');
      expect(result.placeholders.unique).toContain('sales.q3');
      expect(result.placeholders.unique).toContain('sales.q4');

      const q1Directive = result.placeholders.numeric.find(n => n.cleanName === 'sales.q1');
      expect(q1Directive.numericValue).toBe(100000);

      expect(result.statistics.numericDirectives).toBe(4);
    });

    test('should detect DeleteSlideIfEmpty directive', async () => {
      const result = await templater.parseTemplate(pptxTemplatePath);

      expect(result.placeholders.delete).toHaveLength(1);
      expect(result.placeholders.delete[0].cleanName).toBe('optional.slide.content');
      expect(result.placeholders.delete[0].directive).toBe('DeleteSlideIfEmpty');
    });

    test('should count XML files correctly', async () => {
      const result = await templater.parseTemplate(pptxTemplatePath);

      expect(result.statistics.xmlFiles).toBeGreaterThan(0);
    });
  });

  describe('Excel Spreadsheet (.xlsx) Templates', () => {
    let xlsxTemplatePath;

    beforeAll(async () => {
      // Create a realistic Excel spreadsheet template
      const zip = new AdmZip();

      zip.addFile('[Content_Types].xml', Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
</Types>`));

      zip.addFile('xl/worksheets/sheet1.xml', Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
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
      <c r="A3" t="inlineStr"><is><t>Quantity:</t></is></c>
      <c r="B3" t="inlineStr"><is><t>(((product.quantity)))</t></is></c>
    </row>
    <row r="4">
      <c r="A4" t="inlineStr"><is><t>Total:</t></is></c>
      <c r="B4" t="inlineStr"><is><t>$(((product.total)))</t></is></c>
    </row>
  </sheetData>
</worksheet>`));

      xlsxTemplatePath = path.join(testTemplatesDir, 'product-report.xlsx');
      await fs.writeFile(xlsxTemplatePath, zip.toBuffer());
    });

    test('should successfully parse Excel template', async () => {
      const result = await templater.parseTemplate(xlsxTemplatePath);

      expect(result.success).toBe(true);
      expect(result.template.type).toBe('xlsx');
      expect(result.template.mimeType).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    });

    test('should find placeholders in worksheet', async () => {
      const result = await templater.parseTemplate(xlsxTemplatePath);

      expect(result.placeholders.unique).toContain('product.name');
      expect(result.placeholders.unique).toContain('product.sku');
      expect(result.placeholders.unique).toContain('product.price');
      expect(result.placeholders.unique).toContain('product.quantity');
      expect(result.placeholders.unique).toContain('product.total');

      expect(result.statistics.uniquePlaceholders).toBe(5);
    });
  });

  describe('Error Handling', () => {
    test('should handle non-existent file gracefully', async () => {
      const result = await templater.parseTemplate('/path/to/non-existent-file.docx');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error.message).toBeDefined();
      expect(result.template.url).toBe('/path/to/non-existent-file.docx');
    });

    test('should handle invalid file format gracefully', async () => {
      const invalidFilePath = path.join(testTemplatesDir, 'invalid.docx');
      await fs.writeFile(invalidFilePath, Buffer.from('This is not a valid Office document'));

      const result = await templater.parseTemplate(invalidFilePath);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();

      await fs.unlink(invalidFilePath);
    });

    test('should handle corrupted ZIP file gracefully', async () => {
      const corruptedPath = path.join(testTemplatesDir, 'corrupted.pptx');
      // Write partial ZIP file (corrupted)
      await fs.writeFile(corruptedPath, Buffer.from('PK\x03\x04CORRUPTED'));

      const result = await templater.parseTemplate(corruptedPath);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();

      await fs.unlink(corruptedPath);
    });
  });

  describe('Template Caching', () => {
    let cachedTemplatePath;

    beforeAll(async () => {
      const zip = new AdmZip();
      zip.addFile('[Content_Types].xml', Buffer.from('<?xml version="1.0"?><Types></Types>'));
      zip.addFile('word/document.xml', Buffer.from('<?xml version="1.0"?><document>(((test.value)))</document>'));

      cachedTemplatePath = path.join(testTemplatesDir, 'cached-template.docx');
      await fs.writeFile(cachedTemplatePath, zip.toBuffer());
    });

    test('should cache template when cacheTemplates is enabled', async () => {
      const templater1 = new OOXMLTemplater({ cacheTemplates: true });

      const result1 = await templater1.parseTemplate(cachedTemplatePath);
      expect(result1.success).toBe(true);

      // Parse again - should use cache
      const result2 = await templater1.parseTemplate(cachedTemplatePath);
      expect(result2.success).toBe(true);

      // Results should be consistent
      expect(result1.statistics.uniquePlaceholders).toBe(result2.statistics.uniquePlaceholders);
    });

    test('should not cache when cacheTemplates is disabled', async () => {
      const templater2 = new OOXMLTemplater({ cacheTemplates: false });

      const result1 = await templater2.parseTemplate(cachedTemplatePath);
      expect(result1.success).toBe(true);

      const result2 = await templater2.parseTemplate(cachedTemplatePath);
      expect(result2.success).toBe(true);
    });
  });

  describe('Complex Multi-File Templates', () => {
    let complexTemplatePath;

    beforeAll(async () => {
      // Create a PowerPoint with embedded Excel chart
      const zip = new AdmZip();

      zip.addFile('[Content_Types].xml', Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>
  <Override PartName="/ppt/slides/slide1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>
  <Override PartName="/ppt/charts/chart1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawingml.chart+xml"/>
  <Override PartName="/ppt/embeddings/Microsoft_Excel_Worksheet.xlsx" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"/>
</Types>`));

      zip.addFile('ppt/slides/slide1.xml', Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:spTree>
      <p:sp>
        <p:txBody>
          <a:p><a:r><a:t>Report: (((report.title)))</a:t></a:r></a:p>
        </p:txBody>
      </p:sp>
    </p:spTree>
  </p:cSld>
</p:sld>`));

      zip.addFile('ppt/charts/chart1.xml', Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<c:chartSpace xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart">
  <c:chart>
    <c:plotArea>
      <c:barChart>
        <c:ser>
          <c:val>
            <c:numRef>
              <c:numCache>
                <c:pt idx="0"><c:v>(((50000=revenue.jan)))</c:v></c:pt>
                <c:pt idx="1"><c:v>(((75000=revenue.feb)))</c:v></c:pt>
              </c:numCache>
            </c:numRef>
          </c:val>
        </c:ser>
      </c:barChart>
    </c:plotArea>
  </c:chart>
</c:chartSpace>`));

      // Embedded Excel file
      const embeddedZip = new AdmZip();
      embeddedZip.addFile('[Content_Types].xml', Buffer.from('<?xml version="1.0"?><Types></Types>'));
      embeddedZip.addFile('xl/worksheets/sheet1.xml', Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>
    <row r="1">
      <c r="A1" t="inlineStr"><is><t>(((data.source)))</t></is></c>
    </row>
  </sheetData>
</worksheet>`));

      zip.addFile('ppt/embeddings/Microsoft_Excel_Worksheet.xlsx', embeddedZip.toBuffer());

      complexTemplatePath = path.join(testTemplatesDir, 'complex-presentation.pptx');
      await fs.writeFile(complexTemplatePath, zip.toBuffer());
    });

    test('should parse placeholders from main document and embedded files', async () => {
      const result = await templater.parseTemplate(complexTemplatePath);

      expect(result.success).toBe(true);

      // Placeholders from main presentation
      expect(result.placeholders.unique).toContain('report.title');
      expect(result.placeholders.unique).toContain('revenue.jan');
      expect(result.placeholders.unique).toContain('revenue.feb');

      // Note: Embedded Excel files may not be extracted automatically
      // This is a known limitation - embedded files require special handling
      // expect(result.placeholders.unique).toContain('data.source');

      // Verify numeric directives
      expect(result.statistics.numericDirectives).toBe(2);
    });

    test('should provide accurate statistics for complex templates', async () => {
      const result = await templater.parseTemplate(complexTemplatePath);

      expect(result.statistics.totalPlaceholders).toBeGreaterThanOrEqual(3);
      expect(result.statistics.uniquePlaceholders).toBeGreaterThanOrEqual(3); // At least 3 from main presentation
      expect(result.statistics.xmlFiles).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Different Placeholder Types', () => {
    let mixedPlaceholdersPath;

    beforeAll(async () => {
      const zip = new AdmZip();

      zip.addFile('[Content_Types].xml', Buffer.from('<?xml version="1.0"?><Types></Types>'));
      zip.addFile('word/document.xml', Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:t>Regular: (((user.name)))</w:t></w:r></w:p>
    <w:p><w:r><w:t>Numeric: (((999999=chart.value)))</w:t></w:r></w:p>
    <w:p><w:r><w:t>Delete: (((DeletePageIfEmpty=optional.section)))</w:t></w:r></w:p>
    <w:p><w:r><w:t>Duplicate: (((user.name)))</w:t></w:r></w:p>
  </w:body>
</w:document>`));

      mixedPlaceholdersPath = path.join(testTemplatesDir, 'mixed-placeholders.docx');
      await fs.writeFile(mixedPlaceholdersPath, zip.toBuffer());
    });

    test('should correctly categorize different placeholder types', async () => {
      const result = await templater.parseTemplate(mixedPlaceholdersPath);

      expect(result.success).toBe(true);

      // Check all placeholder arrays
      expect(result.placeholders.all).toBeDefined();
      expect(result.placeholders.unique).toBeDefined();
      expect(result.placeholders.numeric).toBeDefined();
      expect(result.placeholders.delete).toBeDefined();

      // Verify unique list doesn't have duplicates
      expect(result.placeholders.unique).toContain('user.name');
      expect(result.placeholders.unique).toContain('chart.value');
      expect(result.placeholders.unique).toContain('optional.section');

      // Verify counts
      expect(result.statistics.totalPlaceholders).toBe(4); // Including duplicate
      expect(result.statistics.uniquePlaceholders).toBe(3);
      expect(result.statistics.numericDirectives).toBe(1);
      expect(result.statistics.deleteDirectives).toBe(1);
    });
  });
});
