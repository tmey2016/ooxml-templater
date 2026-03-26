/**
 * Unit tests for PowerPoint slide deletion cleanup
 * Tests the _cleanupDeletedSlides method in OOXMLTemplater
 */

const OOXMLTemplater = require('../../src/index');

describe('Slide Deletion Cleanup', () => {
  let templater;

  beforeEach(() => {
    templater = new OOXMLTemplater();
  });

  function buildFileStructure() {
    return {
      '[Content_Types].xml':
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
        '<Default Extension="xml" ContentType="application/xml"/>' +
        '<Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>' +
        '<Override PartName="/ppt/slides/slide1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>' +
        '<Override PartName="/ppt/slides/slide2.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>' +
        '<Override PartName="/ppt/slides/slide3.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>' +
        '</Types>',

      'ppt/presentation.xml':
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" ' +
        'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
        '<p:sldIdLst>' +
        '<p:sldId id="256" r:id="rId2"/>' +
        '<p:sldId id="257" r:id="rId3"/>' +
        '<p:sldId id="258" r:id="rId4"/>' +
        '</p:sldIdLst>' +
        '</p:presentation>',

      'ppt/_rels/presentation.xml.rels':
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/>' +
        '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide1.xml"/>' +
        '<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide2.xml"/>' +
        '<Relationship Id="rId4" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide3.xml"/>' +
        '</Relationships>',

      'ppt/slides/slide1.xml': '<p:sld>Slide 1 content</p:sld>',
      'ppt/slides/slide2.xml': '<p:sld>Slide 2 content</p:sld>',
      'ppt/slides/slide3.xml': '<p:sld>Slide 3 content</p:sld>',
      'ppt/slides/_rels/slide1.xml.rels': '<Relationships><Relationship Id="rId1" Type="slideLayout" Target="../slideLayouts/slideLayout1.xml"/></Relationships>',
      'ppt/slides/_rels/slide2.xml.rels': '<Relationships><Relationship Id="rId1" Type="slideLayout" Target="../slideLayouts/slideLayout1.xml"/></Relationships>',
      'ppt/slides/_rels/slide3.xml.rels': '<Relationships><Relationship Id="rId1" Type="slideLayout" Target="../slideLayouts/slideLayout1.xml"/></Relationships>',
      'ppt/slideMasters/slideMaster1.xml': '<p:sldMaster/>',
    };
  }

  test('should remove deleted slide XML and its .rels file', () => {
    const files = buildFileStructure();
    const deletionCandidates = ['ppt/slides/slide2.xml'];

    templater._cleanupDeletedSlides(deletionCandidates, files);

    expect(files['ppt/slides/slide2.xml']).toBeUndefined();
    expect(files['ppt/slides/_rels/slide2.xml.rels']).toBeUndefined();
    // Other slides remain
    expect(files['ppt/slides/slide1.xml']).toBeDefined();
    expect(files['ppt/slides/slide3.xml']).toBeDefined();
    expect(files['ppt/slides/_rels/slide1.xml.rels']).toBeDefined();
    expect(files['ppt/slides/_rels/slide3.xml.rels']).toBeDefined();
  });

  test('should remove Override entry from [Content_Types].xml', () => {
    const files = buildFileStructure();
    const deletionCandidates = ['ppt/slides/slide2.xml'];

    templater._cleanupDeletedSlides(deletionCandidates, files);

    const ct = files['[Content_Types].xml'];
    expect(ct).not.toContain('slide2.xml');
    expect(ct).toContain('slide1.xml');
    expect(ct).toContain('slide3.xml');
  });

  test('should remove Relationship entry from presentation.xml.rels', () => {
    const files = buildFileStructure();
    const deletionCandidates = ['ppt/slides/slide2.xml'];

    templater._cleanupDeletedSlides(deletionCandidates, files);

    const rels = files['ppt/_rels/presentation.xml.rels'];
    expect(rels).not.toContain('slide2.xml');
    expect(rels).not.toContain('rId3');
    expect(rels).toContain('slide1.xml');
    expect(rels).toContain('slide3.xml');
  });

  test('should remove sldId entry from presentation.xml', () => {
    const files = buildFileStructure();
    const deletionCandidates = ['ppt/slides/slide2.xml'];

    templater._cleanupDeletedSlides(deletionCandidates, files);

    const pres = files['ppt/presentation.xml'];
    expect(pres).not.toContain('rId3');
    expect(pres).toContain('rId2');
    expect(pres).toContain('rId4');
  });

  test('should handle deleting multiple slides', () => {
    const files = buildFileStructure();
    const deletionCandidates = ['ppt/slides/slide1.xml', 'ppt/slides/slide3.xml'];

    templater._cleanupDeletedSlides(deletionCandidates, files);

    // Slide files removed
    expect(files['ppt/slides/slide1.xml']).toBeUndefined();
    expect(files['ppt/slides/slide3.xml']).toBeUndefined();
    expect(files['ppt/slides/_rels/slide1.xml.rels']).toBeUndefined();
    expect(files['ppt/slides/_rels/slide3.xml.rels']).toBeUndefined();

    // Slide 2 remains
    expect(files['ppt/slides/slide2.xml']).toBeDefined();

    // Content_Types only has slide2
    const ct = files['[Content_Types].xml'];
    expect(ct).not.toContain('slide1.xml');
    expect(ct).toContain('slide2.xml');
    expect(ct).not.toContain('slide3.xml');

    // presentation.xml only has rId3 (slide2)
    const pres = files['ppt/presentation.xml'];
    expect(pres).not.toContain('rId2');
    expect(pres).toContain('rId3');
    expect(pres).not.toContain('rId4');
  });

  test('should not modify anything when no slide deletions', () => {
    const files = buildFileStructure();
    const original = JSON.parse(JSON.stringify(files));
    const deletionCandidates = ['word/document.xml']; // Not a slide

    templater._cleanupDeletedSlides(deletionCandidates, files);

    expect(files).toEqual(original);
  });

  test('should handle empty deletionCandidates', () => {
    const files = buildFileStructure();
    const original = JSON.parse(JSON.stringify(files));

    templater._cleanupDeletedSlides([], files);

    expect(files).toEqual(original);
  });

  test('should preserve non-slide relationships in presentation.xml.rels', () => {
    const files = buildFileStructure();
    const deletionCandidates = ['ppt/slides/slide1.xml'];

    templater._cleanupDeletedSlides(deletionCandidates, files);

    const rels = files['ppt/_rels/presentation.xml.rels'];
    expect(rels).toContain('slideMaster1.xml');
    expect(rels).toContain('rId1');
  });
});
