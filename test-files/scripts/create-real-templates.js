/**
 * Create Real Office Document Templates for Testing
 * Creates actual .docx, .xlsx, and .pptx files with proper structure
 */

const AdmZip = require('adm-zip');
const fs = require('fs').promises;
const path = require('path');

async function createWordTemplate() {
    console.log('Creating Word document template...');

    const zip = new AdmZip();

    // [Content_Types].xml
    zip.addFile('[Content_Types].xml', Buffer.from(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`));

    // _rels/.rels
    zip.addFile('_rels/.rels', Buffer.from(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`));

    // word/_rels/document.xml.rels
    zip.addFile('word/_rels/document.xml.rels', Buffer.from(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
</Relationships>`));

    // word/document.xml with placeholders
    zip.addFile('word/document.xml', Buffer.from(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:pPr><w:jc w:val="center"/></w:pPr>
      <w:r><w:rPr><w:b/><w:sz w:val="32"/></w:rPr><w:t>SALES REPORT</w:t></w:r>
    </w:p>
    <w:p><w:r><w:t></w:t></w:r></w:p>
    <w:p>
      <w:r><w:rPr><w:b/></w:rPr><w:t>Company: </w:t></w:r>
      <w:r><w:t>(((company.name)))</w:t></w:r>
    </w:p>
    <w:p>
      <w:r><w:rPr><w:b/></w:rPr><w:t>Department: </w:t></w:r>
      <w:r><w:t>(((department)))</w:t></w:r>
    </w:p>
    <w:p>
      <w:r><w:rPr><w:b/></w:rPr><w:t>Report Date: </w:t></w:r>
      <w:r><w:t>(((report.date)))</w:t></w:r>
    </w:p>
    <w:p>
      <w:r><w:rPr><w:b/></w:rPr><w:t>Prepared By: </w:t></w:r>
      <w:r><w:t>(((author.name)))</w:t></w:r>
    </w:p>
    <w:p><w:r><w:t></w:t></w:r></w:p>
    <w:p>
      <w:r><w:rPr><w:b/><w:sz w:val="28"/></w:rPr><w:t>Executive Summary</w:t></w:r>
    </w:p>
    <w:p>
      <w:r><w:t>(((summary)))</w:t></w:r>
    </w:p>
    <w:p><w:r><w:t></w:t></w:r></w:p>
    <w:p>
      <w:r><w:rPr><w:b/><w:sz w:val="28"/></w:rPr><w:t>Key Metrics</w:t></w:r>
    </w:p>
    <w:p>
      <w:r><w:t>Total Revenue: $</w:t></w:r>
      <w:r><w:t>(((metrics.revenue)))</w:t></w:r>
    </w:p>
    <w:p>
      <w:r><w:t>Total Units Sold: </w:t></w:r>
      <w:r><w:t>(((metrics.units)))</w:t></w:r>
    </w:p>
    <w:p>
      <w:r><w:t>Growth Rate: </w:t></w:r>
      <w:r><w:t>(((metrics.growth)))</w:t></w:r>
      <w:r><w:t>%</w:t></w:r>
    </w:p>
    <w:p>
      <w:r><w:t>Customer Satisfaction: </w:t></w:r>
      <w:r><w:t>(((metrics.satisfaction)))</w:t></w:r>
      <w:r><w:t>/10</w:t></w:r>
    </w:p>
    <w:sectPr/>
  </w:body>
</w:document>`));

    const templatePath = path.join(__dirname, '../templates/test-template.docx');
    await fs.writeFile(templatePath, zip.toBuffer());
    console.log('✓ Word template created:', templatePath);
    return templatePath;
}

async function createExcelTemplate() {
    console.log('Creating Excel spreadsheet template...');

    const zip = new AdmZip();

    // [Content_Types].xml
    zip.addFile('[Content_Types].xml', Buffer.from(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>
</Types>`));

    // _rels/.rels
    zip.addFile('_rels/.rels', Buffer.from(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`));

    // xl/_rels/workbook.xml.rels
    zip.addFile('xl/_rels/workbook.xml.rels', Buffer.from(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/>
</Relationships>`));

    // xl/workbook.xml
    zip.addFile('xl/workbook.xml', Buffer.from(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="Sales Data" sheetId="1" r:id="rId1"/>
  </sheets>
</workbook>`));

    // xl/sharedStrings.xml
    zip.addFile('xl/sharedStrings.xml', Buffer.from(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="15" uniqueCount="15">
  <si><t>Product</t></si>
  <si><t>Q1 Sales</t></si>
  <si><t>Q2 Sales</t></si>
  <si><t>Q3 Sales</t></si>
  <si><t>Q4 Sales</t></si>
  <si><t>Total</t></si>
  <si><t>(((product.name)))</t></si>
  <si><t>Company: (((company.name)))</t></si>
  <si><t>Year: (((year)))</t></si>
  <si><t>Region: (((region)))</t></si>
</sst>`));

    // xl/worksheets/sheet1.xml with placeholders and numeric values
    zip.addFile('xl/worksheets/sheet1.xml', Buffer.from(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>
    <row r="1">
      <c r="A1" t="s"><v>7</v></c>
    </row>
    <row r="2">
      <c r="A2" t="s"><v>8</v></c>
    </row>
    <row r="3">
      <c r="A3" t="s"><v>9</v></c>
    </row>
    <row r="4"></row>
    <row r="5">
      <c r="A5" t="s"><v>0</v></c>
      <c r="B5" t="s"><v>1</v></c>
      <c r="C5" t="s"><v>2</v></c>
      <c r="D5" t="s"><v>3</v></c>
      <c r="E5" t="s"><v>4</v></c>
      <c r="F5" t="s"><v>5</v></c>
    </row>
    <row r="6">
      <c r="A6" t="s"><v>6</v></c>
      <c r="B6"><v>25000</v></c>
      <c r="C6"><v>30000</v></c>
      <c r="D6"><v>28000</v></c>
      <c r="E6"><v>35000</v></c>
      <c r="F6"><v>118000</v></c>
    </row>
  </sheetData>
</worksheet>`));

    const templatePath = path.join(__dirname, '../templates/test-template.xlsx');
    await fs.writeFile(templatePath, zip.toBuffer());
    console.log('✓ Excel template created:', templatePath);
    return templatePath;
}

async function createPowerPointTemplate() {
    console.log('Creating PowerPoint presentation template...');

    const zip = new AdmZip();

    // [Content_Types].xml
    zip.addFile('[Content_Types].xml', Buffer.from(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>
  <Override PartName="/ppt/slides/slide1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>
  <Override PartName="/ppt/slides/slide2.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>
  <Override PartName="/ppt/charts/chart1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawingml.chart+xml"/>
</Types>`));

    // _rels/.rels
    zip.addFile('_rels/.rels', Buffer.from(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/>
</Relationships>`));

    // ppt/_rels/presentation.xml.rels
    zip.addFile('ppt/_rels/presentation.xml.rels', Buffer.from(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide2.xml"/>
</Relationships>`));

    // ppt/slides/_rels/slide2.xml.rels (for chart)
    zip.addFile('ppt/slides/_rels/slide2.xml.rels', Buffer.from(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/chart" Target="../charts/chart1.xml"/>
</Relationships>`));

    // ppt/presentation.xml
    zip.addFile('ppt/presentation.xml', Buffer.from(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <p:sldIdLst>
    <p:sldId id="256" r:id="rId1"/>
    <p:sldId id="257" r:id="rId2"/>
  </p:sldIdLst>
</p:presentation>`));

    // ppt/slides/slide1.xml - Title slide with placeholders
    zip.addFile('ppt/slides/slide1.xml', Buffer.from(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
  <p:cSld>
    <p:spTree>
      <p:sp>
        <p:txBody>
          <a:p>
            <a:r><a:rPr lang="en-US" sz="4400" b="1"/><a:t>QUARTERLY BUSINESS REVIEW</a:t></a:r>
          </a:p>
          <a:p>
            <a:r><a:rPr lang="en-US" sz="2800"/><a:t>(((presentation.title)))</a:t></a:r>
          </a:p>
        </p:txBody>
      </p:sp>
      <p:sp>
        <p:txBody>
          <a:p>
            <a:r><a:rPr lang="en-US" sz="2000"/><a:t>Company: (((company.name)))</a:t></a:r>
          </a:p>
          <a:p>
            <a:r><a:rPr lang="en-US" sz="2000"/><a:t>Quarter: (((quarter)))</a:t></a:r>
          </a:p>
          <a:p>
            <a:r><a:rPr lang="en-US" sz="2000"/><a:t>Presented by: (((presenter.name)))</a:t></a:r>
          </a:p>
          <a:p>
            <a:r><a:rPr lang="en-US" sz="2000"/><a:t>Date: (((presentation.date)))</a:t></a:r>
          </a:p>
        </p:txBody>
      </p:sp>
    </p:spTree>
  </p:cSld>
</p:sld>`));

    // ppt/slides/slide2.xml - Data slide with chart and numeric directives
    zip.addFile('ppt/slides/slide2.xml', Buffer.from(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <p:cSld>
    <p:spTree>
      <p:sp>
        <p:txBody>
          <a:p>
            <a:r><a:rPr lang="en-US" sz="3200" b="1"/><a:t>Sales Performance</a:t></a:r>
          </a:p>
        </p:txBody>
      </p:sp>
      <p:sp>
        <p:txBody>
          <a:p>
            <a:r><a:rPr lang="en-US" sz="1800"/><a:t>Chart Data Directives (will be removed):</a:t></a:r>
          </a:p>
          <a:p>
            <a:r><a:rPr lang="en-US" sz="1400"/><a:t>(((100000=sales.q1))) (((150000=sales.q2))) (((180000=sales.q3))) (((220000=sales.q4)))</a:t></a:r>
          </a:p>
        </p:txBody>
      </p:sp>
      <p:graphicFrame>
        <a:graphic>
          <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/chart">
            <c:chart xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" r:id="rId1"/>
          </a:graphicData>
        </a:graphic>
      </p:graphicFrame>
    </p:spTree>
  </p:cSld>
</p:sld>`));

    // ppt/charts/chart1.xml - Bar chart with numeric values
    zip.addFile('ppt/charts/chart1.xml', Buffer.from(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<c:chartSpace xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart">
  <c:chart>
    <c:title>
      <c:tx>
        <c:rich>
          <a:p xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
            <a:r><a:t>Quarterly Sales ($)</a:t></a:r>
          </a:p>
        </c:rich>
      </c:tx>
    </c:title>
    <c:plotArea>
      <c:barChart>
        <c:barDir val="col"/>
        <c:ser>
          <c:idx val="0"/>
          <c:order val="0"/>
          <c:tx>
            <c:strRef>
              <c:strCache>
                <c:pt idx="0"><c:v>Sales</c:v></c:pt>
              </c:strCache>
            </c:strRef>
          </c:tx>
          <c:cat>
            <c:strRef>
              <c:strCache>
                <c:ptCount val="4"/>
                <c:pt idx="0"><c:v>Q1</c:v></c:pt>
                <c:pt idx="1"><c:v>Q2</c:v></c:pt>
                <c:pt idx="2"><c:v>Q3</c:v></c:pt>
                <c:pt idx="3"><c:v>Q4</c:v></c:pt>
              </c:strCache>
            </c:strRef>
          </c:cat>
          <c:val>
            <c:numRef>
              <c:numCache>
                <c:ptCount val="4"/>
                <c:pt idx="0"><c:v>100000</c:v></c:pt>
                <c:pt idx="1"><c:v>150000</c:v></c:pt>
                <c:pt idx="2"><c:v>180000</c:v></c:pt>
                <c:pt idx="3"><c:v>220000</c:v></c:pt>
              </c:numCache>
            </c:numRef>
          </c:val>
        </c:ser>
      </c:barChart>
    </c:plotArea>
  </c:chart>
</c:chartSpace>`));

    const templatePath = path.join(__dirname, '../templates/test-template.pptx');
    await fs.writeFile(templatePath, zip.toBuffer());
    console.log('✓ PowerPoint template created:', templatePath);
    return templatePath;
}

async function main() {
    console.log('='.repeat(80));
    console.log('CREATING REAL OFFICE DOCUMENT TEMPLATES');
    console.log('='.repeat(80));
    console.log();

    try {
        const docxPath = await createWordTemplate();
        const xlsxPath = await createExcelTemplate();
        const pptxPath = await createPowerPointTemplate();

        console.log();
        console.log('='.repeat(80));
        console.log('✓ ALL TEMPLATES CREATED SUCCESSFULLY');
        console.log('='.repeat(80));
        console.log();
        console.log('Templates created:');
        console.log('  1. Word Document:', docxPath);
        console.log('  2. Excel Spreadsheet:', xlsxPath);
        console.log('  3. PowerPoint Presentation:', pptxPath);
        console.log();
        console.log('Next: Run test-real-documents.js to test with actual data');
    } catch (error) {
        console.error('ERROR:', error);
        process.exit(1);
    }
}

main();
