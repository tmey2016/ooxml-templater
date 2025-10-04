/**
 * XML Parser tests
 */

const XmlParser = require('../../../src/utils/xml-parser');

describe('XmlParser', () => {
  describe('discoverXmlFiles', () => {
    test('should discover XML files from extracted ZIP', () => {
      const mockExtractedZip = {
        getAllFiles: () => [
          {
            name: 'word/document.xml',
            content: '<w:document>content</w:document>',
            buffer: Buffer.from(''),
          },
          { name: 'word/header1.xml', content: '<w:hdr>header</w:hdr>', buffer: Buffer.from('') },
          {
            name: 'ppt/slides/slide1.xml',
            content: '<p:sld>slide</p:sld>',
            buffer: Buffer.from(''),
          },
          {
            name: 'xl/worksheets/sheet1.xml',
            content: '<worksheet>data</worksheet>',
            buffer: Buffer.from(''),
          },
          { name: 'docProps/app.xml', content: '<Properties/>', buffer: Buffer.from('') },
          { name: 'content_types.xml', content: '<Types/>', buffer: Buffer.from('') },
          { name: 'image1.png', content: 'binary', buffer: Buffer.from('') }, // Non-XML file
        ],
      };

      const xmlFiles = XmlParser.discoverXmlFiles(mockExtractedZip);

      expect(xmlFiles).toHaveLength(6); // 6 XML files, 1 PNG excluded
      expect(xmlFiles.find((f) => f.path === 'word/document.xml')).toBeDefined();
      expect(xmlFiles.find((f) => f.path === 'word/header1.xml')).toBeDefined();
      expect(xmlFiles.find((f) => f.path === 'ppt/slides/slide1.xml')).toBeDefined();
      expect(xmlFiles.find((f) => f.path === 'xl/worksheets/sheet1.xml')).toBeDefined();
      expect(xmlFiles.find((f) => f.path === 'image1.png')).toBeUndefined();
    });

    test('should include file metadata', () => {
      const mockExtractedZip = {
        getAllFiles: () => [
          {
            name: 'word/document.xml',
            content: '<w:document>content</w:document>',
            buffer: Buffer.from('test'),
          },
        ],
      };

      const xmlFiles = XmlParser.discoverXmlFiles(mockExtractedZip);
      const file = xmlFiles[0];

      expect(file.path).toBe('word/document.xml');
      expect(file.content).toBe('<w:document>content</w:document>');
      expect(file.buffer).toBeDefined();
      expect(file.type).toBe('word');
      expect(file.category).toBe('content');
      expect(file.isEmbedded).toBe(false);
    });
  });

  describe('isXmlFile', () => {
    test('should identify XML files correctly', () => {
      expect(XmlParser.isXmlFile('document.xml')).toBe(true);
      expect(XmlParser.isXmlFile('word/document.xml')).toBe(true);
      expect(XmlParser.isXmlFile('file.XML')).toBe(true); // Case insensitive
      expect(XmlParser.isXmlFile('_rels/.rels')).toBe(true);
      expect(XmlParser.isXmlFile('image.png')).toBe(false);
      expect(XmlParser.isXmlFile('data.txt')).toBe(false);
    });
  });

  describe('getFileType', () => {
    test('should determine file types correctly', () => {
      expect(XmlParser.getFileType('word/document.xml')).toBe('word');
      expect(XmlParser.getFileType('ppt/slides/slide1.xml')).toBe('powerpoint');
      expect(XmlParser.getFileType('xl/worksheets/sheet1.xml')).toBe('excel');
      expect(XmlParser.getFileType('ppt/charts/chart1.xml')).toBe('chart');
      expect(XmlParser.getFileType('xl/drawings/drawing1.xml')).toBe('drawing');
      expect(XmlParser.getFileType('_rels/.rels')).toBe('other');
    });
  });

  describe('getFileCategory', () => {
    test('should determine file categories correctly', () => {
      expect(XmlParser.getFileCategory('word/document.xml')).toBe('content');
      expect(XmlParser.getFileCategory('ppt/slides/slide1.xml')).toBe('content');
      expect(XmlParser.getFileCategory('xl/worksheets/sheet1.xml')).toBe('content');
      expect(XmlParser.getFileCategory('word/_rels/document.xml.rels')).toBe('relationships');
      expect(XmlParser.getFileCategory('ppt/charts/chart1.xml')).toBe('chart');
      expect(XmlParser.getFileCategory('xl/drawings/drawing1.xml')).toBe('drawing');
      expect(XmlParser.getFileCategory('word/header1.xml')).toBe('headerFooter');
      expect(XmlParser.getFileCategory('word/footer1.xml')).toBe('headerFooter');
      expect(XmlParser.getFileCategory('word/comments.xml')).toBe('comments');
      expect(XmlParser.getFileCategory('ppt/notesSlides/notesSlide1.xml')).toBe('notes');
    });
  });

  describe('isEmbeddedFile', () => {
    test('should identify embedded files correctly', () => {
      expect(XmlParser.isEmbeddedFile('word/embeddings/chart1.xml')).toBe(true);
      expect(XmlParser.isEmbeddedFile('ppt/charts/chart1.xml')).toBe(true);
      expect(XmlParser.isEmbeddedFile('xl/charts/chart1.xml')).toBe(true);
      expect(XmlParser.isEmbeddedFile('word/document.xml')).toBe(false);
      expect(XmlParser.isEmbeddedFile('ppt/slides/slide1.xml')).toBe(false);
    });
  });

  describe('sortXmlFiles', () => {
    test('should sort files by priority', () => {
      const files = [
        { path: 'other.xml', category: 'other', isEmbedded: false },
        { path: 'word/document.xml', category: 'content', isEmbedded: false },
        { path: 'word/comments.xml', category: 'comments', isEmbedded: false },
        { path: 'ppt/charts/chart1.xml', category: 'chart', isEmbedded: true },
        { path: '_rels/.rels', category: 'relationships', isEmbedded: false },
      ];

      const sorted = XmlParser.sortXmlFiles(files);

      expect(sorted[0].category).toBe('content'); // Highest priority
      expect(sorted[1].category).toBe('chart');
      expect(sorted[2].category).toBe('comments');
      expect(sorted[3].category).toBe('relationships');
      expect(sorted[4].category).toBe('other'); // Lowest priority
    });

    test('should sort embedded files after non-embedded', () => {
      const files = [
        { path: 'chart1.xml', category: 'chart', isEmbedded: true },
        { path: 'chart2.xml', category: 'chart', isEmbedded: false },
      ];

      const sorted = XmlParser.sortXmlFiles(files);

      expect(sorted[0].isEmbedded).toBe(false); // Non-embedded first
      expect(sorted[1].isEmbedded).toBe(true); // Embedded second
    });
  });

  describe('parseXmlContent', () => {
    test('should parse valid XML content', () => {
      const xmlContent = '<document><text>Hello (((placeholder)))</text></document>';
      const result = XmlParser.parseXmlContent(xmlContent);

      expect(result.originalContent).toBe(xmlContent);
      expect(result.textContent).toBe('Hello (((placeholder)))');
      expect(result.hasContent).toBe(true);
      expect(result.xmlStructure.elements).toContain('document');
      expect(result.xmlStructure.elements).toContain('text');
    });

    test('should handle empty XML content', () => {
      const result = XmlParser.parseXmlContent('');

      expect(result.originalContent).toBe('');
      expect(result.textContent).toBe('');
      expect(result.hasContent).toBe(false);
    });

    test('should handle invalid XML gracefully', () => {
      const invalidXml = '<document><unclosed>';
      const result = XmlParser.parseXmlContent(invalidXml);

      expect(result.originalContent).toBe(invalidXml);
      expect(result.hasContent).toBe(true);
      // Should still extract some text content even from invalid XML
      expect(result.textContent).toBeDefined();
    });
  });

  describe('extractTextContent', () => {
    test('should extract text from XML tags', () => {
      const xml = '<document><text>Hello World</text><data>More text</data></document>';
      const text = XmlParser.extractTextContent(xml);

      expect(text).toBe('Hello World More text');
    });

    test('should normalize whitespace', () => {
      const xml = '<text>  Multiple   spaces  \n  and   newlines  </text>';
      const text = XmlParser.extractTextContent(xml);

      expect(text).toBe('Multiple spaces and newlines');
    });

    test('should handle empty content', () => {
      expect(XmlParser.extractTextContent('')).toBe('');
      expect(XmlParser.extractTextContent('<empty></empty>')).toBe('');
    });
  });

  describe('analyzeXmlStructure', () => {
    test('should find XML elements', () => {
      const xml = '<document><text>content</text><data value="test"/></document>';
      const structure = XmlParser.analyzeXmlStructure(xml);

      expect(structure.elements).toContain('document');
      expect(structure.elements).toContain('text');
      expect(structure.elements).toContain('data');
    });

    test('should find attributes with placeholders', () => {
      const xml = '<chart data="(((chart.data)))" title="(((chart.title)))"/>';
      const structure = XmlParser.analyzeXmlStructure(xml);

      expect(structure.attributes).toHaveLength(2);
      expect(structure.attributes[0].name).toBe('data');
      expect(structure.attributes[0].value).toBe('(((chart.data)))');
      expect(structure.attributes[1].name).toBe('title');
      expect(structure.attributes[1].value).toBe('(((chart.title)))');
    });

    test('should handle empty XML', () => {
      const structure = XmlParser.analyzeXmlStructure('');

      expect(structure.elements).toEqual([]);
      expect(structure.attributes).toEqual([]);
    });
  });

  describe('hasPlaceholderPatterns', () => {
    test('should detect standard placeholders', () => {
      expect(XmlParser.hasPlaceholderPatterns('Hello (((name)))')).toBe(true);
      expect(XmlParser.hasPlaceholderPatterns('Value: (((user.email)))')).toBe(true);
      expect(XmlParser.hasPlaceholderPatterns('No placeholders here')).toBe(false);
    });

    test('should detect numeric directive placeholders', () => {
      expect(XmlParser.hasPlaceholderPatterns('Chart: (((123456=chart.value)))')).toBe(true);
      expect(XmlParser.hasPlaceholderPatterns('Data: (((999=my.data)))')).toBe(true);
    });

    test('should detect delete directive placeholders', () => {
      expect(XmlParser.hasPlaceholderPatterns('(((DeletePageIfEmpty=condition)))')).toBe(true);
      expect(XmlParser.hasPlaceholderPatterns('(((DeleteSlideIfEmpty=check)))')).toBe(true);
    });

    test('should handle empty content', () => {
      expect(XmlParser.hasPlaceholderPatterns('')).toBe(false);
      expect(XmlParser.hasPlaceholderPatterns(null)).toBe(false);
      expect(XmlParser.hasPlaceholderPatterns(undefined)).toBe(false);
    });
  });

  describe('getFilePatternsForType', () => {
    test('should return patterns for Word documents', () => {
      const patterns = XmlParser.getFilePatternsForType('word');

      expect(patterns).toContain('word/document.xml');
      expect(patterns).toContain('word/header*.xml');
      expect(patterns).toContain('word/footer*.xml');
      // Should also include embedded patterns
      expect(patterns).toContain('word/embeddings/**/*.xml');
    });

    test('should return patterns for PowerPoint documents', () => {
      const patterns = XmlParser.getFilePatternsForType('powerpoint');

      expect(patterns).toContain('ppt/slides/slide*.xml');
      expect(patterns).toContain('ppt/slideLayouts/slideLayout*.xml');
      // Should also include embedded patterns
      expect(patterns).toContain('ppt/charts/chart*.xml');
    });

    test('should return patterns for Excel documents', () => {
      const patterns = XmlParser.getFilePatternsForType('excel');

      expect(patterns).toContain('xl/worksheets/sheet*.xml');
      expect(patterns).toContain('xl/sharedStrings.xml');
      // Should also include embedded patterns
      expect(patterns).toContain('xl/charts/chart*.xml');
    });

    test('should return embedded patterns for unknown type', () => {
      const patterns = XmlParser.getFilePatternsForType('unknown');

      expect(patterns).toContain('word/embeddings/**/*.xml');
      expect(patterns).toContain('ppt/embeddings/**/*.xml');
      expect(patterns).toContain('xl/embeddings/**/*.xml');
    });
  });
});
