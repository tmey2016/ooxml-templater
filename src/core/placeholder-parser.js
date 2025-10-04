/**
 * Placeholder Parser
 * Finds and extracts placeholder patterns from XML content
 */

/**
 * PlaceholderParser class for detecting and extracting placeholders from Office documents
 */
class PlaceholderParser {
  constructor() {
    // Placeholder pattern definitions
    this.patterns = {
      // Standard placeholder: (((my.placeholder)))
      standard: /\(\(\(([^)]+)\)\)\)/g,
      // Numeric directive: (((123456=my.placeholder)))
      numeric: /\(\(\((\d+)=([^)]+)\)\)\)/g,
      // Delete directive: (((DeletePageIfEmpty=my.placeholder)))
      deleteDirective: /\(\(\((Delete\w+IfEmpty)=([^)]+)\)\)\)/g,
      // Any placeholder pattern (for detection)
      any: /\(\(\([^)]+\)\)\)/g,
    };

    // Cache for parsed results
    this.cache = new Map();
  }

  /**
   * Parse placeholders from extracted Office document
   * @param {Object} extractedDocument - Document from ZIP handler
   * @param {Object} xmlFiles - XML files from XML parser
   * @returns {Object} Parsed placeholder information
   */
  parseDocument(extractedDocument, xmlFiles) {
    const cacheKey = this.generateCacheKey(xmlFiles);
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    const result = {
      placeholders: [],
      uniquePlaceholders: new Set(),
      numericDirectives: [],
      deleteDirectives: [],
      fileMap: new Map(),
      summary: {
        totalPlaceholders: 0,
        uniqueCount: 0,
        filesWithPlaceholders: 0,
        numericDirectiveCount: 0,
        deleteDirectiveCount: 0,
      },
    };

    // Process each XML file
    for (const xmlFile of xmlFiles) {
      const filePlaceholders = this.parseXmlFile(xmlFile);
      if (filePlaceholders.length > 0) {
        result.fileMap.set(xmlFile.path, filePlaceholders);
        result.placeholders.push(...filePlaceholders);
        result.summary.filesWithPlaceholders++;

        // Add to unique set
        filePlaceholders.forEach((placeholder) => {
          result.uniquePlaceholders.add(placeholder.cleanName);
        });
      }
    }

    // Process numeric and delete directives
    result.numericDirectives = result.placeholders.filter((p) => p.type === 'numeric');
    result.deleteDirectives = result.placeholders.filter((p) => p.type === 'delete');

    // Update summary
    result.summary.totalPlaceholders = result.placeholders.length;
    result.summary.uniqueCount = result.uniquePlaceholders.size;
    result.summary.numericDirectiveCount = result.numericDirectives.length;
    result.summary.deleteDirectiveCount = result.deleteDirectives.length;

    // Convert Set to Array for easier consumption
    result.uniquePlaceholderList = Array.from(result.uniquePlaceholders);

    this.cache.set(cacheKey, result);
    return result;
  }

  /**
   * Parse placeholders from a single XML file
   * @param {Object} xmlFile - XML file object
   * @returns {Array} Array of placeholder objects
   */
  parseXmlFile(xmlFile) {
    const placeholders = [];
    const content = xmlFile.content || '';

    if (!content.trim()) {
      return placeholders;
    }

    // Find all placeholder patterns
    const matches = this.findAllPlaceholders(content);

    for (const match of matches) {
      const placeholder = this.createPlaceholderObject(match, xmlFile);
      placeholders.push(placeholder);
    }

    return placeholders;
  }

  /**
   * Find all placeholder patterns in content
   * @param {string} content - XML content to search
   * @returns {Array} Array of match objects
   */
  findAllPlaceholders(content) {
    const matches = [];
    const processedRanges = new Set();

    // Find numeric directive placeholders first (most specific)
    let match;
    while ((match = this.patterns.numeric.exec(content)) !== null) {
      const range = `${match.index}-${match.index + match[0].length}`;
      processedRanges.add(range);
      matches.push({
        type: 'numeric',
        fullMatch: match[0],
        numericValue: match[1],
        content: match[2],
        index: match.index,
        length: match[0].length,
      });
    }
    this.patterns.numeric.lastIndex = 0;

    // Find delete directive placeholders (second most specific)
    while ((match = this.patterns.deleteDirective.exec(content)) !== null) {
      const range = `${match.index}-${match.index + match[0].length}`;
      if (!processedRanges.has(range)) {
        processedRanges.add(range);
        matches.push({
          type: 'delete',
          fullMatch: match[0],
          directive: match[1],
          content: match[2],
          index: match.index,
          length: match[0].length,
        });
      }
    }
    this.patterns.deleteDirective.lastIndex = 0;

    // Find standard placeholders (least specific, catch remaining)
    while ((match = this.patterns.standard.exec(content)) !== null) {
      const range = `${match.index}-${match.index + match[0].length}`;
      if (!processedRanges.has(range)) {
        processedRanges.add(range);
        matches.push({
          type: 'standard',
          fullMatch: match[0],
          content: match[1],
          index: match.index,
          length: match[0].length,
        });
      }
    }
    this.patterns.standard.lastIndex = 0;

    // Sort matches by position in document
    return matches.sort((a, b) => a.index - b.index);
  }

  /**
   * Create placeholder object with metadata
   * @param {Object} match - Regex match object
   * @param {Object} xmlFile - XML file object
   * @returns {Object} Placeholder object
   */
  createPlaceholderObject(match, xmlFile) {
    const placeholder = {
      type: match.type,
      rawPattern: match.fullMatch,
      cleanName: match.content,
      position: {
        file: xmlFile.path,
        fileType: xmlFile.type,
        fileCategory: xmlFile.category,
        index: match.index,
        length: match.length,
      },
      context: this.extractContext(xmlFile.content, match.index, match.length),
    };

    // Add type-specific properties
    if (match.type === 'numeric') {
      placeholder.numericValue = parseInt(match.numericValue, 10);
      placeholder.originalNumber = match.numericValue;
    } else if (match.type === 'delete') {
      placeholder.directive = match.directive;
      placeholder.deleteType = this.getDeleteType(match.directive);
    }

    return placeholder;
  }

  /**
   * Extract context around placeholder for debugging
   * @param {string} content - Full XML content
   * @param {number} index - Placeholder position
   * @param {number} length - Placeholder length
   * @returns {Object} Context object
   */
  extractContext(content, index, length, contextLength = 100) {
    const start = Math.max(0, index - contextLength);
    const end = Math.min(content.length, index + length + contextLength);

    return {
      before: content.slice(start, index),
      placeholder: content.slice(index, index + length),
      after: content.slice(index + length, end),
      fullContext: content.slice(start, end),
    };
  }

  /**
   * Determine delete type from directive
   * @param {string} directive - Delete directive (e.g., "DeletePageIfEmpty")
   * @returns {string} Delete type
   */
  getDeleteType(directive) {
    const lowerDirective = directive.toLowerCase();
    if (lowerDirective.includes('page')) {
      return 'page';
    } else if (lowerDirective.includes('slide')) {
      return 'slide';
    } else if (lowerDirective.includes('row')) {
      return 'row';
    } else if (lowerDirective.includes('section')) {
      return 'section';
    }
    return 'unknown';
  }

  /**
   * Generate cache key for parsed document
   * @param {Array} xmlFiles - XML files array
   * @returns {string} Cache key
   */
  generateCacheKey(xmlFiles) {
    // Sort files by path to ensure consistent ordering
    const sortedFiles = [...xmlFiles].sort((a, b) => a.path.localeCompare(b.path));
    const paths = sortedFiles.map((file) => file.path);
    const contentHashes = sortedFiles.map((file) => this.simpleHash(file.content || ''));
    return `${paths.join('|')}:${contentHashes.join('|')}`;
  }

  /**
   * Simple hash function for content
   * @param {string} content - Content to hash
   * @returns {number} Hash value
   */
  simpleHash(content) {
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash;
  }

  /**
   * Get unique placeholders for data request
   * @param {Object} parseResult - Result from parseDocument
   * @returns {Array} Array of unique placeholder names
   */
  getUniquePlaceholders(parseResult) {
    return parseResult.uniquePlaceholderList || [];
  }

  /**
   * Get numeric directives for chart data substitution
   * @param {Object} parseResult - Result from parseDocument
   * @returns {Array} Array of numeric directive objects
   */
  getNumericDirectives(parseResult) {
    return parseResult.numericDirectives || [];
  }

  /**
   * Get delete directives for conditional content removal
   * @param {Object} parseResult - Result from parseDocument
   * @returns {Array} Array of delete directive objects
   */
  getDeleteDirectives(parseResult) {
    return parseResult.deleteDirectives || [];
  }

  /**
   * Clear parser cache
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Validate placeholder name
   * @param {string} placeholderName - Placeholder name to validate
   * @returns {boolean} True if valid
   */
  isValidPlaceholderName(placeholderName) {
    if (!placeholderName || typeof placeholderName !== 'string') {
      return false;
    }

    // Basic validation - no empty strings, reasonable length
    const trimmed = placeholderName.trim();
    return trimmed.length > 0 && trimmed.length <= 200;
  }

  /**
   * Parse placeholder name into parts (e.g., "user.name" -> ["user", "name"])
   * @param {string} placeholderName - Placeholder name
   * @returns {Array} Array of name parts
   */
  parsePlaceholderName(placeholderName) {
    if (!this.isValidPlaceholderName(placeholderName)) {
      return [];
    }

    return placeholderName.trim().split('.').filter(Boolean);
  }
}

module.exports = PlaceholderParser;
