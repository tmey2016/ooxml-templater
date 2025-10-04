/**
 * Browser ZIP handling utilities
 * Uses zip.js library for compression/extraction in browsers
 */

/**
 * Browser ZIP handler implementation
 * Requires zip.js to be loaded globally
 */
class BrowserZipHandler {
  constructor() {
    this.cache = new Map();
    this.zipLib = null;
    this.initializeZipLib();
  }

  /**
   * Initialize zip.js library
   */
  initializeZipLib() {
    if (typeof window !== 'undefined' && window.zip) {
      this.zipLib = window.zip;
      // Configure zip.js
      this.zipLib.configure({
        useWebWorkers: false, // Disable web workers for simplicity
      });
    } else {
      // eslint-disable-next-line no-console
      console.warn('zip.js library not found. Please include zip.js before using this library.');
    }
  }

  /**
   * Extract ZIP file from URL or blob
   * @param {string|Blob|File} source - URL, Blob, or File containing ZIP data
   * @returns {Promise<Object>} ZIP file structure and content
   */
  async extract(source) {
    if (!this.zipLib) {
      throw new Error('zip.js library not available. Please include zip.js in your HTML.');
    }

    let zipBlob;

    if (typeof source === 'string') {
      // Source is URL - fetch the file
      if (this.cache.has(source)) {
        zipBlob = this.cache.get(source);
      } else {
        const response = await fetch(source);
        if (!response.ok) {
          throw new Error(`Failed to fetch ZIP file: ${response.statusText}`);
        }
        zipBlob = await response.blob();
        this.cache.set(source, zipBlob);
      }
    } else {
      // Source is already a blob or file
      zipBlob = source;
    }

    const zipReader = new this.zipLib.ZipReader(new this.zipLib.BlobReader(zipBlob));
    const entries = await zipReader.getEntries();

    const files = {};
    for (const entry of entries) {
      if (!entry.directory) {
        const content = await entry.getData(new this.zipLib.TextWriter());
        const buffer = await entry.getData(new this.zipLib.BlobWriter());

        files[entry.filename] = {
          name: entry.filename,
          content,
          buffer,
        };
      }
    }

    await zipReader.close();

    return {
      files,
      getFile: (path) => files[path],
      getAllFiles: () => Object.values(files),
      getXmlFiles: () => Object.values(files).filter((file) => file.name.endsWith('.xml')),
    };
  }

  /**
   * Create ZIP file from file structure
   * @param {Object} fileStructure - Object containing file paths and content
   * @returns {Promise<Blob>} ZIP file blob
   */
  async create(fileStructure) {
    if (!this.zipLib) {
      throw new Error('zip.js library not available. Please include zip.js in your HTML.');
    }

    const zipWriter = new this.zipLib.ZipWriter(new this.zipLib.BlobWriter('application/zip'));

    for (const [path, content] of Object.entries(fileStructure)) {
      let reader;
      if (typeof content === 'string') {
        reader = new this.zipLib.TextReader(content);
      } else if (content instanceof Blob) {
        reader = new this.zipLib.BlobReader(content);
      } else if (content && content.buffer instanceof Blob) {
        reader = new this.zipLib.BlobReader(content.buffer);
      } else if (content && typeof content.content === 'string') {
        reader = new this.zipLib.TextReader(content.content);
      } else {
        continue; // Skip invalid content
      }

      await zipWriter.add(path, reader);
    }

    const zipBlob = await zipWriter.close();
    return zipBlob;
  }

  /**
   * Trigger download of ZIP blob
   * @param {Blob} zipBlob - ZIP file blob
   * @param {string} filename - Download filename
   */
  downloadBlob(zipBlob, filename) {
    if (typeof window === 'undefined') {
      throw new Error('downloadBlob is only available in browser environment');
    }

    const url = URL.createObjectURL(zipBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
  }
}

module.exports = new BrowserZipHandler();
