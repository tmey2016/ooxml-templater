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

// ── Step 1: Build a valid 3-slide PPTX template ─────────────────────────────

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
        '<Override PartName="/ppt/presProps.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presProps+xml"/>' +
        '<Override PartName="/ppt/viewProps.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.viewProps+xml"/>' +
        '<Override PartName="/ppt/tableStyles.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.tableStyles+xml"/>' +
        '<Override PartName="/ppt/slides/slide1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>' +
        '<Override PartName="/ppt/slides/slide2.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>' +
        '<Override PartName="/ppt/slides/slide3.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>' +
        '<Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/>' +
        '<Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/>' +
        '<Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>' +
        '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>' +
        '<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>' +
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
        '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>' +
        '<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>' +
        '</Relationships>',
      'utf8'
    )
  );

  // docProps/core.xml
  zip.addFile(
    'docProps/core.xml',
    Buffer.from(
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" ' +
        'xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" ' +
        'xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">' +
        '<dc:title>Slide Deletion Test</dc:title>' +
        '<dc:creator>ooxml-templater</dc:creator>' +
        '<dcterms:created xsi:type="dcterms:W3CDTF">2026-01-01T00:00:00Z</dcterms:created>' +
        '<dcterms:modified xsi:type="dcterms:W3CDTF">2026-01-01T00:00:00Z</dcterms:modified>' +
        '</cp:coreProperties>',
      'utf8'
    )
  );

  // docProps/app.xml
  zip.addFile(
    'docProps/app.xml',
    Buffer.from(
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" ' +
        'xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">' +
        '<TotalTime>0</TotalTime>' +
        '<Words>0</Words>' +
        '<Application>ooxml-templater</Application>' +
        '<PresentationFormat>On-screen Show (4:3)</PresentationFormat>' +
        '<Slides>3</Slides>' +
        '</Properties>',
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
        'xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" saveSubsetFonts="1">' +
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
        '<Relationship Id="rId5" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/presProps" Target="presProps.xml"/>' +
        '<Relationship Id="rId6" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/viewProps" Target="viewProps.xml"/>' +
        '<Relationship Id="rId7" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/tableStyles" Target="tableStyles.xml"/>' +
        '<Relationship Id="rId8" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="theme/theme1.xml"/>' +
        '</Relationships>',
      'utf8'
    )
  );

  // ppt/presProps.xml
  zip.addFile(
    'ppt/presProps.xml',
    Buffer.from(
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<p:presentationPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" ' +
        'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" ' +
        'xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"/>',
      'utf8'
    )
  );

  // ppt/viewProps.xml
  zip.addFile(
    'ppt/viewProps.xml',
    Buffer.from(
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<p:viewPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" ' +
        'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" ' +
        'xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">' +
        '<p:normalViewPr>' +
        '<p:restoredLeft sz="15620"/>' +
        '<p:restoredTop sz="94660"/>' +
        '</p:normalViewPr>' +
        '<p:slideViewPr>' +
        '<p:cSldViewPr>' +
        '<p:cViewPr varScale="1"><p:scale><a:sx n="114" d="100"/><a:sy n="114" d="100"/></p:scale><p:origin x="90" y="174"/></p:cViewPr>' +
        '<p:guideLst/>' +
        '</p:cSldViewPr>' +
        '</p:slideViewPr>' +
        '</p:viewPr>',
      'utf8'
    )
  );

  // ppt/tableStyles.xml
  zip.addFile(
    'ppt/tableStyles.xml',
    Buffer.from(
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<a:tblStyleLst xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" def="{5C22544A-7EE6-4342-B048-85BDC9FD1C3A}"/>',
      'utf8'
    )
  );

  // ppt/theme/theme1.xml — minimal Office theme
  zip.addFile(
    'ppt/theme/theme1.xml',
    Buffer.from(
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="Office Theme">' +
        '<a:themeElements>' +
        '<a:clrScheme name="Office">' +
        '<a:dk1><a:sysClr val="windowText" lastClr="000000"/></a:dk1>' +
        '<a:lt1><a:sysClr val="window" lastClr="FFFFFF"/></a:lt1>' +
        '<a:dk2><a:srgbClr val="44546A"/></a:dk2>' +
        '<a:lt2><a:srgbClr val="E7E6E6"/></a:lt2>' +
        '<a:accent1><a:srgbClr val="4472C4"/></a:accent1>' +
        '<a:accent2><a:srgbClr val="ED7D31"/></a:accent2>' +
        '<a:accent3><a:srgbClr val="A5A5A5"/></a:accent3>' +
        '<a:accent4><a:srgbClr val="FFC000"/></a:accent4>' +
        '<a:accent5><a:srgbClr val="5B9BD5"/></a:accent5>' +
        '<a:accent6><a:srgbClr val="70AD47"/></a:accent6>' +
        '<a:hlink><a:srgbClr val="0563C1"/></a:hlink>' +
        '<a:folHlink><a:srgbClr val="954F72"/></a:folHlink>' +
        '</a:clrScheme>' +
        '<a:fontScheme name="Office">' +
        '<a:majorFont><a:latin typeface="Calibri Light"/><a:ea typeface=""/><a:cs typeface=""/></a:majorFont>' +
        '<a:minorFont><a:latin typeface="Calibri"/><a:ea typeface=""/><a:cs typeface=""/></a:minorFont>' +
        '</a:fontScheme>' +
        '<a:fmtScheme name="Office">' +
        '<a:fillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:fillStyleLst>' +
        '<a:lnStyleLst><a:ln w="6350"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln><a:ln w="12700"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln><a:ln w="19050"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln></a:lnStyleLst>' +
        '<a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst>' +
        '<a:bgFillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:bgFillStyleLst>' +
        '</a:fmtScheme>' +
        '</a:themeElements>' +
        '<a:objectDefaults/>' +
        '<a:extraClrSchemeLst/>' +
        '</a:theme>',
      'utf8'
    )
  );

  // slideMaster with theme reference
  zip.addFile(
    'ppt/slideMasters/slideMaster1.xml',
    Buffer.from(
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<p:sldMaster xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" ' +
        'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" ' +
        'xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">' +
        '<p:cSld>' +
        '<p:bg><p:bgRef idx="1001"><a:schemeClr val="bg1"/></p:bgRef></p:bg>' +
        '<p:spTree>' +
        '<p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>' +
        '<p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>' +
        '</p:spTree>' +
        '</p:cSld>' +
        '<p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/>' +
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
        '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="../theme/theme1.xml"/>' +
        '</Relationships>',
      'utf8'
    )
  );

  // slideLayout with slideMaster reference
  zip.addFile(
    'ppt/slideLayouts/slideLayout1.xml',
    Buffer.from(
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<p:sldLayout xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" ' +
        'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" ' +
        'xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" type="blank" preserve="1">' +
        '<p:cSld name="Blank"><p:spTree>' +
        '<p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>' +
        '<p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>' +
        '</p:spTree></p:cSld>' +
        '<p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>' +
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

  // Slide helper — produces a proper slide with a text box
  function slideXml(title, extraPlaceholder) {
    return (
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" ' +
      'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" ' +
      'xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">' +
      '<p:cSld><p:spTree>' +
      '<p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>' +
      '<p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>' +
      '<p:sp>' +
      '<p:nvSpPr><p:cNvPr id="2" name="TextBox 1"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr>' +
      '<p:spPr>' +
      '<a:xfrm><a:off x="457200" y="274638"/><a:ext cx="8229600" cy="1143000"/></a:xfrm>' +
      '<a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/>' +
      '</p:spPr>' +
      '<p:txBody>' +
      '<a:bodyPr wrap="square" rtlCol="0"/><a:lstStyle/>' +
      '<a:p><a:r><a:rPr lang="en-US" dirty="0" smtClean="0"/><a:t>' + title + '</a:t></a:r></a:p>' +
      (extraPlaceholder
        ? '<a:p><a:r><a:rPr lang="en-US" dirty="0" smtClean="0"/><a:t>' + extraPlaceholder + '</a:t></a:r></a:p>'
        : '') +
      '</p:txBody>' +
      '</p:sp>' +
      '</p:spTree></p:cSld>' +
      '<p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>' +
      '</p:sld>'
    );
  }

  // Slide 1 — keep
  zip.addFile('ppt/slides/slide1.xml', Buffer.from(slideXml('Slide 1 - Introduction'), 'utf8'));

  // Slide 2 — should be deleted (has DeleteSlideIfEmpty directive)
  zip.addFile(
    'ppt/slides/slide2.xml',
    Buffer.from(slideXml('Slide 2 - Optional Content', '(((DeleteSlideIfEmpty=optionalContent)))'), 'utf8')
  );

  // Slide 3 — keep
  zip.addFile('ppt/slides/slide3.xml', Buffer.from(slideXml('Slide 3 - Conclusion'), 'utf8'));

  // Slide .rels files
  const slideRels =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>' +
    '</Relationships>';

  zip.addFile('ppt/slides/_rels/slide1.xml.rels', Buffer.from(slideRels, 'utf8'));
  zip.addFile('ppt/slides/_rels/slide2.xml.rels', Buffer.from(slideRels, 'utf8'));
  zip.addFile('ppt/slides/_rels/slide3.xml.rels', Buffer.from(slideRels, 'utf8'));

  // Write template
  fs.mkdirSync(path.dirname(TEMPLATE_PATH), { recursive: true });
  zip.writeZip(TEMPLATE_PATH);
  console.log(`Created template: ${TEMPLATE_PATH}`);
}

// ── Step 2: Run substitution with empty data to trigger deletion ─────────────

async function runSubstitution() {
  const templater = new OOXMLTemplater();

  const result = await templater.substituteTemplate(TEMPLATE_PATH, {
    optionalContent: '', // empty -> triggers DeleteSlideIfEmpty
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
  check('slide2.xml.rels removed from ZIP', !entries.includes('ppt/slides/_rels/slide2.xml.rels'));

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
  check('presentation.xml.rels still has slideMaster reference', presRels.includes('slideMaster1.xml'));
  check('presentation.xml.rels still has theme reference', presRels.includes('theme1.xml'));

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

  // 8. Required infrastructure files exist
  check('theme1.xml present', entries.includes('ppt/theme/theme1.xml'));
  check('presProps.xml present', entries.includes('ppt/presProps.xml'));
  check('viewProps.xml present', entries.includes('ppt/viewProps.xml'));
  check('tableStyles.xml present', entries.includes('ppt/tableStyles.xml'));

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
