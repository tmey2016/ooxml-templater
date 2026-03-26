/**
 * End-to-end test: Create a 3-slide PPTX, delete slide 2 via DeleteSlideIfEmpty,
 * then inspect the output ZIP to verify all references are cleaned up.
 */

const path = require('path');
const fs = require('fs');
const AdmZip = require('adm-zip');
const OOXMLTemplater = require('../../src/index');

const OUTPUT_DIR = path.join(__dirname, '..', 'outputs');
const TEMPLATE_PATH = path.join(__dirname, '..', 'templates', 'slide-deletion-test.pptx');
const OUTPUT_PATH = path.join(OUTPUT_DIR, 'slide-deletion-result.pptx');

// ── Step 1: Build a minimal valid 3-slide PPTX template ─────────────────────

function createTestTemplate() {
  const zip = new AdmZip();

  // [Content_Types].xml
  zip.addFile(
    '[Content_Types].xml',
    Buffer.from(
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
        '<Default Extension="xml" ContentType="application/xml"/>' +
        '<Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>' +
        '<Override PartName="/ppt/slides/slide1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>' +
        '<Override PartName="/ppt/slides/slide2.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>' +
        '<Override PartName="/ppt/slides/slide3.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>' +
        '<Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/>' +
        '<Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/>' +
        '</Types>',
      'utf8'
    )
  );

  // _rels/.rels
  zip.addFile(
    '_rels/.rels',
    Buffer.from(
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/>' +
        '</Relationships>',
      'utf8'
    )
  );

  // ppt/presentation.xml
  zip.addFile(
    'ppt/presentation.xml',
    Buffer.from(
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" ' +
        'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" ' +
        'xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">' +
        '<p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst>' +
        '<p:sldIdLst>' +
        '<p:sldId id="256" r:id="rId2"/>' +
        '<p:sldId id="257" r:id="rId3"/>' +
        '<p:sldId id="258" r:id="rId4"/>' +
        '</p:sldIdLst>' +
        '<p:sldSz cx="9144000" cy="6858000" type="screen4x3"/>' +
        '<p:notesSz cx="6858000" cy="9144000"/>' +
        '</p:presentation>',
      'utf8'
    )
  );

  // ppt/_rels/presentation.xml.rels
  zip.addFile(
    'ppt/_rels/presentation.xml.rels',
    Buffer.from(
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/>' +
        '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide1.xml"/>' +
        '<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide2.xml"/>' +
        '<Relationship Id="rId4" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide3.xml"/>' +
        '</Relationships>',
      'utf8'
    )
  );

  function slideXml(title, extraPlaceholder) {
    return (
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" ' +
      'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" ' +
      'xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">' +
      '<p:cSld><p:spTree>' +
      '<p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>' +
      '<p:grpSpPr/>' +
      '<p:sp><p:nvSpPr><p:cNvPr id="2" name="Title"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>' +
      '<p:spPr/>' +
      '<p:txBody><a:bodyPr/><a:lstStyle/>' +
      '<a:p><a:r><a:t>' +
      title +
      '</a:t></a:r></a:p>' +
      (extraPlaceholder
        ? '<a:p><a:r><a:t>' + extraPlaceholder + '</a:t></a:r></a:p>'
        : '') +
      '</p:txBody></p:sp>' +
      '</p:spTree></p:cSld></p:sld>'
    );
  }

  // Slide 1 — keep
  zip.addFile(
    'ppt/slides/slide1.xml',
    Buffer.from(slideXml('Slide 1 - Introduction'), 'utf8')
  );

  // Slide 2 — should be deleted (has DeleteSlideIfEmpty directive)
  zip.addFile(
    'ppt/slides/slide2.xml',
    Buffer.from(
      slideXml(
        'Slide 2 - Optional Content',
        '(((DeleteSlideIfEmpty=optionalContent)))'
      ),
      'utf8'
    )
  );

  // Slide 3 — keep
  zip.addFile(
    'ppt/slides/slide3.xml',
    Buffer.from(slideXml('Slide 3 - Conclusion'), 'utf8')
  );

  // Slide .rels files
  const slideRels =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>' +
    '</Relationships>';

  zip.addFile('ppt/slides/_rels/slide1.xml.rels', Buffer.from(slideRels, 'utf8'));
  zip.addFile('ppt/slides/_rels/slide2.xml.rels', Buffer.from(slideRels, 'utf8'));
  zip.addFile('ppt/slides/_rels/slide3.xml.rels', Buffer.from(slideRels, 'utf8'));

  // Minimal slideMaster and slideLayout so PowerPoint doesn't complain
  zip.addFile(
    'ppt/slideMasters/slideMaster1.xml',
    Buffer.from(
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<p:sldMaster xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" ' +
        'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" ' +
        'xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">' +
        '<p:cSld><p:spTree>' +
        '<p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>' +
        '<p:grpSpPr/>' +
        '</p:spTree></p:cSld>' +
        '<p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst>' +
        '</p:sldMaster>',
      'utf8'
    )
  );

  zip.addFile(
    'ppt/slideMasters/_rels/slideMaster1.xml.rels',
    Buffer.from(
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>' +
        '</Relationships>',
      'utf8'
    )
  );

  zip.addFile(
    'ppt/slideLayouts/slideLayout1.xml',
    Buffer.from(
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<p:sldLayout xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" ' +
        'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" ' +
        'xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" type="blank">' +
        '<p:cSld><p:spTree>' +
        '<p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>' +
        '<p:grpSpPr/>' +
        '</p:spTree></p:cSld>' +
        '</p:sldLayout>',
      'utf8'
    )
  );

  zip.addFile(
    'ppt/slideLayouts/_rels/slideLayout1.xml.rels',
    Buffer.from(
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="../slideMasters/slideMaster1.xml"/>' +
        '</Relationships>',
      'utf8'
    )
  );

  // Write template
  fs.mkdirSync(path.dirname(TEMPLATE_PATH), { recursive: true });
  zip.writeZip(TEMPLATE_PATH);
  console.log(`Created template: ${TEMPLATE_PATH}`);
}

// ── Step 2: Run substitution with empty data to trigger deletion ─────────────

async function runSubstitution() {
  const templater = new OOXMLTemplater();

  const result = await templater.substituteTemplate(TEMPLATE_PATH, {
    optionalContent: '', // empty → triggers DeleteSlideIfEmpty
  });

  if (!result.success) {
    console.error('Substitution FAILED:', result.error);
    process.exit(1);
  }

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, result.document);
  console.log(`Wrote output: ${OUTPUT_PATH}`);

  return result;
}

// ── Step 3: Inspect the output ZIP and validate ──────────────────────────────

function inspectOutput() {
  const zip = new AdmZip(OUTPUT_PATH);
  const entries = zip.getEntries().map((e) => e.entryName);

  console.log('\n=== OUTPUT ZIP ENTRIES ===');
  entries.forEach((e) => console.log('  ' + e));

  let pass = true;

  function check(label, condition) {
    const status = condition ? 'PASS' : 'FAIL';
    console.log(`[${status}] ${label}`);
    if (!condition) {
      pass = false;
    }
  }

  console.log('\n=== VALIDATION ===');

  // 1. slide2.xml should NOT be in the ZIP
  check('slide2.xml removed from ZIP', !entries.includes('ppt/slides/slide2.xml'));

  // 2. slide2.xml.rels should NOT be in the ZIP
  check(
    'slide2.xml.rels removed from ZIP',
    !entries.includes('ppt/slides/_rels/slide2.xml.rels')
  );

  // 3. slide1 and slide3 should still exist
  check('slide1.xml still present', entries.includes('ppt/slides/slide1.xml'));
  check('slide3.xml still present', entries.includes('ppt/slides/slide3.xml'));

  // 4. [Content_Types].xml should not reference slide2
  const ct = zip.readAsText('[Content_Types].xml');
  check('[Content_Types].xml has no slide2 reference', !ct.includes('slide2.xml'));
  check('[Content_Types].xml still has slide1 reference', ct.includes('slide1.xml'));
  check('[Content_Types].xml still has slide3 reference', ct.includes('slide3.xml'));

  // 5. presentation.xml.rels should not reference slide2
  const presRels = zip.readAsText('ppt/_rels/presentation.xml.rels');
  check('presentation.xml.rels has no slide2 reference', !presRels.includes('slide2.xml'));
  check('presentation.xml.rels still has slide1 reference', presRels.includes('slide1.xml'));
  check('presentation.xml.rels still has slide3 reference', presRels.includes('slide3.xml'));
  check(
    'presentation.xml.rels still has slideMaster reference',
    presRels.includes('slideMaster1.xml')
  );

  // 6. presentation.xml should not have the sldId for the deleted slide
  const pres = zip.readAsText('ppt/presentation.xml');
  check('presentation.xml has no rId3 (deleted slide)', !pres.includes('rId3'));
  check('presentation.xml still has rId2 (slide1)', pres.includes('rId2'));
  check('presentation.xml still has rId4 (slide3)', pres.includes('rId4'));

  // 7. Remaining slide content should be intact
  const slide1 = zip.readAsText('ppt/slides/slide1.xml');
  check('slide1 content intact', slide1.includes('Slide 1 - Introduction'));

  const slide3 = zip.readAsText('ppt/slides/slide3.xml');
  check('slide3 content intact', slide3.includes('Slide 3 - Conclusion'));

  console.log('\n' + (pass ? '*** ALL CHECKS PASSED ***' : '*** SOME CHECKS FAILED ***'));
  return pass;
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('=== PPTX SLIDE DELETION END-TO-END TEST ===\n');

  createTestTemplate();
  await runSubstitution();
  const pass = inspectOutput();

  process.exit(pass ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
