/**
 * OOXML Templater - Main entry point
 * A JavaScript library for dynamic placeholder substitution in Office Open XML documents
 */

// Environment detection
const isNode = typeof window === 'undefined' && typeof global !== 'undefined';
const isBrowser = typeof window !== 'undefined';

// Platform-specific imports will be handled here
let zipHandler;

if (isNode) {
  // Node.js environment - use native modules
  zipHandler = require('./utils/node-zip');
} else if (isBrowser) {
  // Browser environment - expect zip.js to be available globally
  zipHandler = require('./utils/browser-zip');
}

// Core library components
const PlaceholderParser = require('./core/placeholder-parser');
const PlaceholderSubstitution = require('./core/placeholder-substitution');
const xmlParser = require('./utils/xml-parser');
const {
  fetchTemplate,
  detectMimeType,
  detectDocumentType,
  extractFilename,
} = require('./utils/fetch-handler');
// const TemplateProcessor = require('./core/template-processor');
// const DocumentGenerator = require('./core/document-generator');

/**
 * Main OOXML Templater class
 */
class OOXMLTemplater {
  constructor(options = {}) {
    this.options = {
      cacheTemplates: true,
      ...options,
      environment: isNode ? 'node' : 'browser',
    };
    this.zipHandler = zipHandler;
    this.placeholderParser = new PlaceholderParser();
    this.placeholderSubstitution = new PlaceholderSubstitution();
    this.xmlParser = xmlParser;
  }

  /**
   * Parse template and extract all placeholders
   * @param {string} templateUrl - URL or file path to the template
   * @param {object} options - Parse options
   * @returns {Promise<object>} Parse result with placeholders and metadata
   */
  async parseTemplate(templateUrl, _options = {}) {
    try {
      // Fetch the template
      const templateBuffer = await fetchTemplate(templateUrl);

      // Extract ZIP contents
      const extractedFiles = await this.zipHandler.extract(templateBuffer);

      // Discover XML files
      const xmlFiles = this.xmlParser.discoverXmlFiles(extractedFiles);

      // Parse placeholders from all XML files
      const parseResult = this.placeholderParser.parseDocument(extractedFiles, xmlFiles);

      // Detect document metadata
      const documentType = detectDocumentType(templateUrl);
      const mimeType = detectMimeType(templateUrl);
      const filename = extractFilename(templateUrl);

      // Build response
      return {
        success: true,
        template: {
          url: templateUrl,
          type: documentType,
          mimeType: mimeType,
          filename: filename,
        },
        placeholders: {
          all: parseResult.placeholders,
          unique: parseResult.uniquePlaceholderList,
          numeric: parseResult.numericDirectives,
          delete: parseResult.deleteDirectives,
        },
        statistics: {
          totalPlaceholders: parseResult.summary.totalPlaceholders,
          uniquePlaceholders: parseResult.summary.uniqueCount,
          numericDirectives: parseResult.summary.numericDirectiveCount,
          deleteDirectives: parseResult.summary.deleteDirectiveCount,
          xmlFiles: xmlFiles.length,
        },
        metadata: {
          parsedAt: new Date().toISOString(),
          environment: this.options.environment,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          message: error.message,
          stack: error.stack,
        },
        template: {
          url: templateUrl,
        },
      };
    }
  }

  /**
   * Fetch placeholder data from API endpoint
   * @param {string} apiUrl - API endpoint URL
   * @param {Array<string>} placeholders - Array of unique placeholder names
   * @param {object} options - Request options
   * @returns {Promise<object>} API response with placeholder values
   */
  async fetchData(apiUrl, placeholders, options = {}) {
    try {
      const requestOptions = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        body: JSON.stringify({
          placeholders: placeholders,
          ...options.additionalData,
        }),
        ...options.fetchOptions,
      };

      let response;
      if (isNode) {
        // Node.js environment - use node-fetch or native fetch (Node 18+)
        if (typeof fetch === 'undefined') {
          // For older Node.js versions, require node-fetch if available
          try {
            const nodeFetch = require('node-fetch');
            response = await nodeFetch(apiUrl, requestOptions);
          } catch {
            throw new Error('fetch is not available. Please use Node.js 18+ or install node-fetch');
          }
        } else {
          response = await fetch(apiUrl, requestOptions);
        }
      } else {
        // Browser environment - use native fetch
        response = await fetch(apiUrl, requestOptions);
      }

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      // Extract the actual data from various possible response formats
      const actualData = data.data || data.values || data.placeholders || data;

      // Return format based on options
      const filename = data.filename || options.defaultFilename || null;

      // If returnRawData is true, return just the data object
      if (options.returnRawData === true) {
        return actualData;
      }

      // Otherwise return full response format for consistency
      return {
        success: true,
        data: actualData,
        filename: filename,
        metadata: {
          fetchedAt: new Date().toISOString(),
          apiUrl: apiUrl,
          placeholderCount: placeholders.length,
        },
        rawResponse: options.includeRawResponse ? data : undefined,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          message: error.message,
          stack: error.stack,
          type: error.name,
        },
        apiUrl: apiUrl,
        placeholders: placeholders,
      };
    }
  }

  /**
   * Substitute placeholders in template with data
   * @param {string} templateUrl - URL or file path to the template
   * @param {object} data - Data object with values for placeholders
   * @param {object} options - Substitution options
   * @returns {Promise<object>} Substitution result with modified document
   */
  async substituteTemplate(templateUrl, data, options = {}) {
    try {
      // Step 1: Fetch the template
      const templateBuffer = await fetchTemplate(templateUrl);

      // Step 2: Extract ZIP contents
      const extractedFiles = await this.zipHandler.extract(templateBuffer);

      // Step 3: Discover XML files
      const xmlFiles = this.xmlParser.discoverXmlFiles(extractedFiles);

      // Step 4: Parse placeholders from all XML files
      const parseResult = this.placeholderParser.parseDocument(extractedFiles, xmlFiles);

      // Step 5: Substitute placeholders with data
      const substitutionResult = this.placeholderSubstitution.substituteDocument(
        parseResult,
        data,
        xmlFiles,
        {
          strictMode: options.strictMode || false,
          preserveUnmatched: options.preserveUnmatched !== false,
          logMissingData: options.logMissingData !== false,
          deleteEmptyElements: options.deleteEmptyElements !== false,
        }
      );

      // Step 6: Rebuild file structure with modified XML files
      const modifiedFileStructure = {};

      // Copy all original files from the extracted ZIP
      const originalFiles = extractedFiles.files || extractedFiles;
      for (const [filePath, fileData] of Object.entries(originalFiles)) {
        if (typeof fileData === 'string') {
          modifiedFileStructure[filePath] = fileData;
        } else if (fileData && fileData.buffer) {
          // Use buffer for binary files, content for XML files
          const isXmlFile = filePath.endsWith('.xml') || filePath.endsWith('.rels');
          modifiedFileStructure[filePath] = isXmlFile && fileData.content ? fileData.content : fileData.buffer;
        } else if (fileData && fileData.content !== undefined) {
          // File object with content property only (fallback)
          modifiedFileStructure[filePath] = fileData.content;
        } else {
          modifiedFileStructure[filePath] = fileData;
        }
      }

      // Update with modified XML files
      for (const [filePath, modifiedFile] of substitutionResult.modifiedFiles) {
        // Check if this is an embedded file path
        if (filePath.includes('.xlsx/') || filePath.includes('.docx/') || filePath.includes('.pptx/')) {
          // This is an embedded file - handle separately
          continue;
        }

        // Extract content from the modified file object
        if (modifiedFile && modifiedFile.content !== undefined) {
          modifiedFileStructure[filePath] = modifiedFile.content;
        } else if (typeof modifiedFile === 'string') {
          modifiedFileStructure[filePath] = modifiedFile;
        } else {
          modifiedFileStructure[filePath] = modifiedFile;
        }
      }

      // Step 6b: Rebuild embedded Office files
      if (extractedFiles.embeddedFiles) {
        for (const [embeddedPath, embeddedData] of Object.entries(extractedFiles.embeddedFiles)) {
          const modifiedEmbeddedFiles = {};
          let hasModifications = false;

          // Check if any XML files in this embedded file were modified
          for (const [xmlPath, xmlFile] of Object.entries(embeddedData.files)) {
            const fullPath = `${embeddedPath}/${xmlPath}`;
            const modifiedFile = substitutionResult.modifiedFiles.get(fullPath);

            if (modifiedFile) {
              hasModifications = true;
              modifiedEmbeddedFiles[xmlPath] = modifiedFile.content || modifiedFile;
            } else {
              modifiedEmbeddedFiles[xmlPath] = xmlFile;
            }
          }

          // If any modifications were made, recreate the embedded file
          if (hasModifications) {
            const recreatedBuffer = await this.zipHandler.recreateEmbeddedOfficeFile({
              path: embeddedPath,
              files: modifiedEmbeddedFiles,
            });
            modifiedFileStructure[embeddedPath] = recreatedBuffer;
          }
        }
      }

      // Step 7: Create new ZIP with modified files
      const outputBuffer = await this.zipHandler.create(modifiedFileStructure);

      // Detect document metadata
      const documentType = detectDocumentType(templateUrl);
      const mimeType = detectMimeType(templateUrl);
      const filename = extractFilename(templateUrl);

      return {
        success: true,
        document: outputBuffer,
        template: {
          url: templateUrl,
          type: documentType,
          mimeType: mimeType,
          filename: filename,
        },
        substitution: {
          stats: substitutionResult.stats,
          deletionCandidates: substitutionResult.deletionCandidates,
        },
        metadata: {
          substitutedAt: new Date().toISOString(),
          environment: this.options.environment,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          message: error.message,
          stack: error.stack,
          type: error.name,
        },
        template: {
          url: templateUrl,
        },
      };
    }
  }

  /**
   * Download document in browser (triggers browser download)
   * @param {Buffer} documentBuffer - Document buffer to download
   * @param {object} options - Download options
   * @returns {object} Download result
   */
  downloadDocument(documentBuffer, options = {}) {
    if (!isBrowser) {
      return {
        success: false,
        error: {
          message: 'downloadDocument is only available in browser environment',
          type: 'EnvironmentError',
        },
      };
    }

    try {
      const filename = options.filename || 'document.docx';
      const mimeType = options.mimeType || detectMimeType(filename);

      // Create blob from buffer
      const blob = new Blob([documentBuffer], { type: mimeType });

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;

      // Trigger download
      document.body.appendChild(link);
      link.click();

      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      return {
        success: true,
        filename: filename,
        mimeType: mimeType,
        size: documentBuffer.length,
        metadata: {
          downloadedAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          message: error.message,
          stack: error.stack,
          type: error.name,
        },
      };
    }
  }

  /**
   * Save document to file system (Node.js only)
   * @param {Buffer} documentBuffer - Document buffer to save
   * @param {string} outputPath - File path to save to
   * @param {object} options - Save options
   * @returns {Promise<object>} Save result
   */
  async saveDocument(documentBuffer, outputPath, _options = {}) {
    if (!isNode) {
      return {
        success: false,
        error: {
          message: 'saveDocument is only available in Node.js environment',
          type: 'EnvironmentError',
        },
      };
    }

    try {
      const fs = require('fs').promises;
      const path = require('path');

      // Ensure directory exists
      const directory = path.dirname(outputPath);
      await fs.mkdir(directory, { recursive: true });

      // Write file
      await fs.writeFile(outputPath, documentBuffer);

      // Get file stats
      const stats = await fs.stat(outputPath);

      return {
        success: true,
        path: outputPath,
        filename: path.basename(outputPath),
        size: stats.size,
        metadata: {
          savedAt: new Date().toISOString(),
          absolutePath: path.resolve(outputPath),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          message: error.message,
          stack: error.stack,
          type: error.name,
        },
        path: outputPath,
      };
    }
  }

  /**
   * Complete end-to-end template processing workflow
   * @param {string} templateUrl - URL or path to template
   * @param {string|object} dataSource - API URL or data object
   * @param {object} options - Processing options
   * @returns {Promise<object>} Processing result with document
   */
  async processTemplate(templateUrl, dataSource, options = {}) {
    try {
      let data;

      // Step 1: Parse template
      const parseResult = await this.parseTemplate(templateUrl);
      if (!parseResult.success) {
        throw new Error(`Template parsing failed: ${parseResult.error.message}`);
      }

      // Step 2: Get data (either from API or use provided object)
      if (typeof dataSource === 'string') {
        // dataSource is API URL
        const fetchResult = await this.fetchData(
          dataSource,
          parseResult.placeholders.unique,
          options.fetchOptions || {}
        );

        if (!fetchResult.success) {
          throw new Error(`Data fetching failed: ${fetchResult.error.message}`);
        }

        data = fetchResult.data;

        // Use filename from API response if available
        if (fetchResult.filename && !options.filename) {
          options.filename = fetchResult.filename;
        }
      } else {
        // dataSource is data object
        data = dataSource;
      }

      // Step 3: Substitute placeholders
      const substituteResult = await this.substituteTemplate(
        templateUrl,
        data,
        options.substitutionOptions || {}
      );
      if (!substituteResult.success) {
        throw new Error(`Substitution failed: ${substituteResult.error.message}`);
      }

      // Step 4: Output document
      const filename = options.filename || substituteResult.template.filename || 'output.docx';
      const mimeType = options.mimeType || substituteResult.template.mimeType;

      let outputResult;
      if (options.outputPath) {
        // Save to file (Node.js)
        outputResult = await this.saveDocument(substituteResult.document, options.outputPath);
      } else if (options.download && isBrowser) {
        // Trigger browser download
        outputResult = this.downloadDocument(substituteResult.document, { filename, mimeType });
      } else {
        // Return buffer
        outputResult = {
          success: true,
          type: 'buffer',
          document: substituteResult.document,
        };
      }

      return {
        success: true,
        document: substituteResult.document,
        output: outputResult,
        template: substituteResult.template,
        parsing: {
          placeholders: parseResult.placeholders,
          statistics: parseResult.statistics,
        },
        substitution: substituteResult.substitution,
        metadata: {
          processedAt: new Date().toISOString(),
          environment: this.options.environment,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          message: error.message,
          stack: error.stack,
          type: error.name,
        },
        template: {
          url: templateUrl,
        },
      };
    }
  }

  async generateDocument(_template, _data) {
    // Alias for processTemplate for backward compatibility
    throw new Error('generateDocument not yet implemented - use processTemplate instead');
  }
}

// Export for both CommonJS and ES modules
module.exports = OOXMLTemplater;
module.exports.OOXMLTemplater = OOXMLTemplater;
module.exports.default = OOXMLTemplater;

// Browser global export
if (isBrowser && typeof window !== 'undefined') {
  window.OOXMLTemplater = OOXMLTemplater;
}
