/**
 * Node.js ZIP handling utilities
 * Uses adm-zip for compression/extraction in Node.js environment
 */

const AdmZip = require('adm-zip');
const fetch = require('node-fetch');
const fs = require('fs').promises;

/**
 * Node.js ZIP handler implementation
 */
class NodeZipHandler {
  constructor() {
    this.cache = new Map();
  }

  /**
   * Extract ZIP file from URL or buffer
   * @param {string|Buffer} source - URL or buffer containing ZIP data
   * @returns {Promise<Object>} ZIP file structure and content
   */
  async extract(source) {
    let zipBuffer;

    if (typeof source === 'string') {
      // Source is URL or file path - fetch the file
      if (this.cache.has(source)) {
        zipBuffer = this.cache.get(source);
      } else {
        // Check if it's a URL or file path
        const isUrl =
          source.startsWith('http://') ||
          source.startsWith('https://') ||
          source.startsWith('file://');

        if (isUrl) {
          const response = await fetch(source);
          if (!response.ok) {
            throw new Error(`Failed to fetch ZIP file: ${response.statusText}`);
          }
          zipBuffer = Buffer.from(await response.arrayBuffer());
        } else {
          // Local file path
          zipBuffer = await fs.readFile(source);
        }
        this.cache.set(source, zipBuffer);
      }
    } else {
      // Source is already a buffer
      zipBuffer = source;
    }

    const zip = new AdmZip(zipBuffer);
    const entries = zip.getEntries();

    const files = {};
    entries.forEach((entry) => {
      if (!entry.isDirectory) {
        const buffer = entry.getData();
        const isXmlFile = entry.entryName.endsWith('.xml') || entry.entryName.endsWith('.rels');

        files[entry.entryName] = {
          name: entry.entryName,
          content: isXmlFile ? buffer.toString('utf8') : null,
          buffer: buffer,
        };
      }
    });

    // Process embedded Office files (xlsx, docx, pptx within the main document)
    const embeddedFiles = await this.extractEmbeddedOfficeFiles(files);

    return {
      files,
      zip,
      embeddedFiles,
      getFile: (path) => files[path],
      getAllFiles: () => Object.values(files),
      getXmlFiles: () => Object.values(files).filter((file) => file.name.endsWith('.xml')),
    };
  }

  /**
   * Extract embedded Office files (Excel/Word/PowerPoint files within the main document)
   * @param {Object} files - Files from main extraction
   * @returns {Promise<Object>} Map of embedded file paths to their extracted contents
   */
  async extractEmbeddedOfficeFiles(files) {
    const embeddedFiles = {};

    for (const [filePath, fileData] of Object.entries(files)) {
      // Check if this is an embedded Office file
      const isEmbeddedOffice =
        (filePath.includes('/embeddings/') || filePath.includes('\\embeddings\\')) &&
        (filePath.endsWith('.xlsx') || filePath.endsWith('.docx') || filePath.endsWith('.pptx'));

      if (isEmbeddedOffice && fileData.buffer) {
        try {
          // Extract the embedded Office file (which is itself a ZIP)
          const embeddedZip = new AdmZip(fileData.buffer);
          const embeddedEntries = embeddedZip.getEntries();

          const embeddedContent = {};
          embeddedEntries.forEach((entry) => {
            if (!entry.isDirectory) {
              const buffer = entry.getData();
              const isXmlFile = entry.entryName.endsWith('.xml') || entry.entryName.endsWith('.rels');

              embeddedContent[entry.entryName] = {
                name: entry.entryName,
                content: isXmlFile ? buffer.toString('utf8') : null,
                buffer: buffer,
              };
            }
          });

          embeddedFiles[filePath] = {
            path: filePath,
            files: embeddedContent,
            originalBuffer: fileData.buffer,
          };
        } catch (error) {
          // If extraction fails, skip this embedded file
          console.warn(`Failed to extract embedded file ${filePath}: ${error.message}`);
        }
      }
    }

    return embeddedFiles;
  }

  /**
   * Recreate an embedded Office file from modified content
   * @param {Object} embeddedFileData - Embedded file data with modified content
   * @returns {Promise<Buffer>} Recreated Office file buffer
   */
  async recreateEmbeddedOfficeFile(embeddedFileData) {
    const zip = new AdmZip();

    for (const [path, content] of Object.entries(embeddedFileData.files)) {
      if (typeof content === 'string') {
        zip.addFile(path, Buffer.from(content, 'utf8'));
      } else if (Buffer.isBuffer(content)) {
        zip.addFile(path, content);
      } else if (content && content.buffer) {
        const isXmlFile = path.endsWith('.xml') || path.endsWith('.rels');
        zip.addFile(path, isXmlFile && content.content ? Buffer.from(content.content, 'utf8') : content.buffer);
      }
    }

    return zip.toBuffer();
  }

  /**
   * Create ZIP file from file structure
   * @param {Object} fileStructure - Object containing file paths and content
   * @returns {Promise<Buffer>} ZIP file buffer
   */
  async create(fileStructure) {
    const zip = new AdmZip();

    for (const [path, content] of Object.entries(fileStructure)) {
      if (typeof content === 'string') {
        zip.addFile(path, Buffer.from(content, 'utf8'));
      } else if (Buffer.isBuffer(content)) {
        zip.addFile(path, content);
      } else if (content && content.buffer) {
        zip.addFile(path, content.buffer);
      }
    }

    return zip.toBuffer();
  }

  /**
   * Save ZIP buffer to file
   * @param {Buffer} zipBuffer - ZIP file buffer
   * @param {string} outputPath - Output file path
   * @returns {Promise<void>}
   */
  async saveToFile(zipBuffer, outputPath) {
    await fs.writeFile(outputPath, zipBuffer);
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
  }
}

module.exports = new NodeZipHandler();
