/**
 * XML Parser utilities
 * Handles XML file discovery and content parsing for Office documents
 */

/**
 * XML Parser class for Office document processing
 */
class XmlParser {
  constructor() {
    // Office document file patterns
    this.xmlPatterns = {
      // Word document XML files
      word: [
        'word/document.xml', // Main document content
        'word/header*.xml', // Headers
        'word/footer*.xml', // Footers
        'word/comments.xml', // Comments
        'word/footnotes.xml', // Footnotes
        'word/endnotes.xml', // Endnotes
      ],
      // PowerPoint XML files
      powerpoint: [
        'ppt/slides/slide*.xml', // Slide content
        'ppt/slideLayouts/slideLayout*.xml', // Slide layouts
        'ppt/slideMasters/slideMaster*.xml', // Slide masters
        'ppt/notesSlides/notesSlide*.xml', // Notes
        'ppt/comments/comment*.xml', // Comments
      ],
      // Excel XML files
      excel: [
        'xl/worksheets/sheet*.xml', // Worksheet content
        'xl/sharedStrings.xml', // Shared strings
        'xl/comments*.xml', // Comments
        'xl/drawings/drawing*.xml', // Drawings
      ],
      // Common embedded files
      embedded: [
        'word/embeddings/**/*.xml',
        'ppt/embeddings/**/*.xml',
        'xl/embeddings/**/*.xml',
        'ppt/charts/chart*.xml', // PowerPoint charts
        'xl/charts/chart*.xml', // Excel charts
      ],
    };
  }

  /**
   * Discover all XML files in an Office document
   * @param {Object} extractedZip - Extracted ZIP structure from ZIP handler
   * @returns {Array} Array of XML file objects with metadata
   */
  discoverXmlFiles(extractedZip) {
    const xmlFiles = [];
    const allFiles = extractedZip.getAllFiles();

    for (const file of allFiles) {
      if (this.isXmlFile(file.name)) {
        const fileInfo = {
          path: file.name,
          content: file.content,
          buffer: file.buffer,
          type: this.getFileType(file.name),
          category: this.getFileCategory(file.name),
          isEmbedded: this.isEmbeddedFile(file.name),
        };
        xmlFiles.push(fileInfo);
      }
    }

    return this.sortXmlFiles(xmlFiles);
  }

  /**
   * Check if a file is an XML file
   * @param {string} filename - File path/name
   * @returns {boolean} True if file is XML
   */
  isXmlFile(filename) {
    return filename.toLowerCase().endsWith('.xml') || filename.toLowerCase().endsWith('.rels');
  }

  /**
   * Determine the file type (word, powerpoint, excel)
   * @param {string} filename - File path/name
   * @returns {string} File type
   */
  getFileType(filename) {
    const path = filename.toLowerCase();

    // Check for specific file types first (more specific matches)
    if (path.includes('chart')) {
      return 'chart';
    } else if (path.includes('drawing')) {
      return 'drawing';
    } else if (path.startsWith('word/')) {
      return 'word';
    } else if (path.startsWith('ppt/')) {
      return 'powerpoint';
    } else if (path.startsWith('xl/')) {
      return 'excel';
    } else {
      return 'other';
    }
  }

  /**
   * Determine the file category
   * @param {string} filename - File path/name
   * @returns {string} File category
   */
  getFileCategory(filename) {
    const path = filename.toLowerCase();

    // Relationship files (check first, more specific)
    if (path.endsWith('.rels')) {
      return 'relationships';
    }

    // Notes (check before slide, more specific)
    if (path.includes('notes')) {
      return 'notes';
    }

    // Chart files
    if (path.includes('chart')) {
      return 'chart';
    }

    // Drawing files
    if (path.includes('drawing')) {
      return 'drawing';
    }

    // Header/Footer files
    if (path.includes('header') || path.includes('footer')) {
      return 'headerFooter';
    }

    // Comments
    if (path.includes('comment')) {
      return 'comments';
    }

    // Content files (check after more specific patterns)
    if (path.includes('document.xml') || path.includes('slide') || path.includes('sheet')) {
      return 'content';
    }

    return 'other';
  }

  /**
   * Check if file is embedded content
   * @param {string} filename - File path/name
   * @returns {boolean} True if file is embedded
   */
  isEmbeddedFile(filename) {
    const path = filename.toLowerCase();
    return (
      path.includes('embedding') ||
      path.includes('chart') ||
      (path.includes('xl/') && path.includes('ppt/')) ||
      (path.includes('word/') && (path.includes('xl/') || path.includes('ppt/')))
    );
  }

  /**
   * Sort XML files by priority for processing
   * @param {Array} xmlFiles - Array of XML file objects
   * @returns {Array} Sorted XML files
   */
  sortXmlFiles(xmlFiles) {
    const priority = {
      content: 1,
      chart: 2,
      drawing: 3,
      headerFooter: 4,
      comments: 5,
      notes: 6,
      relationships: 7,
      other: 8,
    };

    return xmlFiles.sort((a, b) => {
      const priorityA = priority[a.category] || 9;
      const priorityB = priority[b.category] || 9;

      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }

      // Secondary sort by embedded status (embedded files last)
      if (a.isEmbedded !== b.isEmbedded) {
        return a.isEmbedded ? 1 : -1;
      }

      // Tertiary sort by path
      return a.path.localeCompare(b.path);
    });
  }

  /**
   * Parse XML content recursively to find all text content
   * @param {string} xmlContent - XML content to parse
   * @returns {Object} Parsed content with text extraction
   */
  parseXmlContent(xmlContent) {
    try {
      // Simple XML parsing without heavy libraries
      // Extract text content and preserve structure information
      const result = {
        originalContent: xmlContent,
        textContent: this.extractTextContent(xmlContent),
        xmlStructure: this.analyzeXmlStructure(xmlContent),
        hasContent: xmlContent.trim().length > 0,
      };

      return result;
    } catch (error) {
      return {
        originalContent: xmlContent,
        textContent: '',
        xmlStructure: { elements: [], attributes: [] },
        hasContent: false,
        error: error.message,
      };
    }
  }

  /**
   * Extract all text content from XML (simple approach)
   * @param {string} xmlContent - XML content
   * @returns {string} Extracted text content
   */
  extractTextContent(xmlContent) {
    if (!xmlContent) {
      return '';
    }

    // Remove XML tags and extract text content
    // This is a simple approach that works for most Office XML
    return xmlContent
      .replace(/<[^>]*>/g, ' ') // Remove all XML tags
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  /**
   * Analyze XML structure for placeholder detection
   * @param {string} xmlContent - XML content
   * @returns {Object} Structure analysis
   */
  analyzeXmlStructure(xmlContent) {
    if (!xmlContent) {
      return { elements: [], attributes: [] };
    }

    const elements = [];
    const attributes = [];

    // Find all XML elements
    const elementRegex = /<([^/\s>]+)[^>]*>/g;
    let match;

    while ((match = elementRegex.exec(xmlContent)) !== null) {
      const elementName = match[1];
      if (!elements.includes(elementName)) {
        elements.push(elementName);
      }
    }

    // Find attributes that might contain placeholders
    const attributeRegex = /(\w+)=["']([^"']*\(\(\([^)]*\)\)\)[^"']*)["']/g;
    while ((match = attributeRegex.exec(xmlContent)) !== null) {
      attributes.push({
        name: match[1],
        value: match[2],
      });
    }

    return { elements, attributes };
  }

  /**
   * Get file patterns for a specific Office document type
   * @param {string} documentType - Document type (word, powerpoint, excel)
   * @returns {Array} Array of file patterns
   */
  getFilePatternsForType(documentType) {
    const patterns = this.xmlPatterns[documentType] || [];
    return [...patterns, ...this.xmlPatterns.embedded];
  }

  /**
   * Check if XML content likely contains placeholders
   * @param {string} xmlContent - XML content to check
   * @returns {boolean} True if placeholders might be present
   */
  hasPlaceholderPatterns(xmlContent) {
    if (!xmlContent) {
      return false;
    }

    // Look for placeholder-like patterns
    const placeholderPatterns = [
      /\(\(\([^)]+\)\)\)/, // Standard placeholder pattern
      /\(\(\(\d+=\w+[^)]*\)\)\)/, // Numeric directive pattern
      /\(\(\(Delete\w+[^)]*\)\)\)/, // Delete directive pattern
    ];

    return placeholderPatterns.some((pattern) => pattern.test(xmlContent));
  }
}

module.exports = new XmlParser();
