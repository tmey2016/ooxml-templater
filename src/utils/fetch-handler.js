/**
 * Fetch Handler - Unified template retrieval for Node.js and Browser
 * Handles fetching templates from URLs or file paths
 */

const isNode = typeof window === 'undefined' && typeof global !== 'undefined';

/**
 * Fetch template from URL or file path
 * @param {string} urlOrPath - URL (browser/node) or file path (node only)
 * @param {object} options - Fetch options
 * @returns {Promise<ArrayBuffer>} Template content as ArrayBuffer
 */
async function fetchTemplate(urlOrPath, options = {}) {
  if (isNode) {
    return fetchTemplateNode(urlOrPath, options);
  } else {
    return fetchTemplateBrowser(urlOrPath, options);
  }
}

/**
 * Node.js implementation - supports URLs and file paths
 */
async function fetchTemplateNode(urlOrPath, options) {
  // Check if it's a URL or file path
  const isUrl =
    urlOrPath.startsWith('http://') ||
    urlOrPath.startsWith('https://') ||
    urlOrPath.startsWith('file://');

  if (isUrl) {
    // Use node-fetch for URLs
    const fetch = require('node-fetch');
    const response = await fetch(urlOrPath, options);

    if (!response.ok) {
      throw new Error(`Failed to fetch template: ${response.status} ${response.statusText}`);
    }

    const buffer = await response.buffer();
    return buffer; // Return the Buffer directly
  } else {
    // Use fs for local file paths
    const fs = require('fs').promises;
    const path = require('path');

    const resolvedPath = path.resolve(urlOrPath);
    const buffer = await fs.readFile(resolvedPath);
    return buffer; // Return the Buffer directly
  }
}

/**
 * Browser implementation - URLs only
 */
async function fetchTemplateBrowser(url, options) {
  if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('blob:')) {
    throw new Error('Browser environment requires HTTP(S) URLs or Blob URLs');
  }

  const response = await fetch(url, options);

  if (!response.ok) {
    throw new Error(`Failed to fetch template: ${response.status} ${response.statusText}`);
  }

  return await response.arrayBuffer();
}

/**
 * Detect MIME type from file extension or content
 * @param {string} urlOrPath - URL or file path
 * @returns {string} MIME type
 */
function detectMimeType(urlOrPath) {
  const extension = urlOrPath.split('.').pop().toLowerCase();

  const mimeTypes = {
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  };

  return mimeTypes[extension] || 'application/octet-stream';
}

/**
 * Detect document type from file extension
 * @param {string} urlOrPath - URL or file path
 * @returns {string} Document type (docx, pptx, xlsx, or unknown)
 */
function detectDocumentType(urlOrPath) {
  const extension = urlOrPath.split('.').pop().toLowerCase();

  if (['docx', 'pptx', 'xlsx'].includes(extension)) {
    return extension;
  }

  return 'unknown';
}

/**
 * Extract filename from URL or path
 * @param {string} urlOrPath - URL or file path
 * @returns {string} Filename
 */
function extractFilename(urlOrPath) {
  // Remove query parameters and hash
  const cleanPath = urlOrPath.split('?')[0].split('#')[0];

  // Extract filename from path (handle both / and \ separators)
  const parts = cleanPath.split(/[/\\]/);
  return parts[parts.length - 1] || 'template.docx';
}

module.exports = {
  fetchTemplate,
  detectMimeType,
  detectDocumentType,
  extractFilename,
};
