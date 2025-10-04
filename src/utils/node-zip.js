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
      // Source is URL - fetch the file
      if (this.cache.has(source)) {
        zipBuffer = this.cache.get(source);
      } else {
        const response = await fetch(source);
        if (!response.ok) {
          throw new Error(`Failed to fetch ZIP file: ${response.statusText}`);
        }
        zipBuffer = Buffer.from(await response.arrayBuffer());
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
        files[entry.entryName] = {
          name: entry.entryName,
          content: entry.getData().toString('utf8'),
          buffer: entry.getData(),
        };
      }
    });

    return {
      files,
      zip,
      getFile: (path) => files[path],
      getAllFiles: () => Object.values(files),
      getXmlFiles: () => Object.values(files).filter((file) => file.name.endsWith('.xml')),
    };
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
