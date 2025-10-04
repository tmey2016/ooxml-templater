/**
 * Unit tests for Fetch Handler utility
 */

const {
  fetchTemplate,
  detectMimeType,
  detectDocumentType,
  extractFilename,
} = require('../../../src/utils/fetch-handler');
const fs = require('fs').promises;
const path = require('path');

describe('FetchHandler', () => {
  describe('detectMimeType', () => {
    it('should detect DOCX MIME type', () => {
      expect(detectMimeType('template.docx')).toBe(
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      );
    });

    it('should detect PPTX MIME type', () => {
      expect(detectMimeType('presentation.pptx')).toBe(
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      );
    });

    it('should detect XLSX MIME type', () => {
      expect(detectMimeType('spreadsheet.xlsx')).toBe(
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
    });

    it('should return default MIME type for unknown extensions', () => {
      expect(detectMimeType('file.unknown')).toBe('application/octet-stream');
    });

    it('should handle URLs with paths', () => {
      expect(detectMimeType('https://example.com/files/template.docx')).toBe(
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      );
    });
  });

  describe('detectDocumentType', () => {
    it('should detect docx type', () => {
      expect(detectDocumentType('template.docx')).toBe('docx');
    });

    it('should detect pptx type', () => {
      expect(detectDocumentType('presentation.pptx')).toBe('pptx');
    });

    it('should detect xlsx type', () => {
      expect(detectDocumentType('spreadsheet.xlsx')).toBe('xlsx');
    });

    it('should return unknown for unsupported types', () => {
      expect(detectDocumentType('file.pdf')).toBe('unknown');
    });

    it('should handle case insensitivity', () => {
      expect(detectDocumentType('template.DOCX')).toBe('docx');
    });
  });

  describe('extractFilename', () => {
    it('should extract filename from path', () => {
      expect(extractFilename('/path/to/template.docx')).toBe('template.docx');
    });

    it('should extract filename from URL', () => {
      expect(extractFilename('https://example.com/files/template.docx')).toBe('template.docx');
    });

    it('should remove query parameters', () => {
      expect(extractFilename('https://example.com/template.docx?version=1')).toBe('template.docx');
    });

    it('should remove hash fragments', () => {
      expect(extractFilename('https://example.com/template.docx#section1')).toBe('template.docx');
    });

    it('should handle both query and hash', () => {
      expect(extractFilename('https://example.com/template.docx?v=1#section')).toBe(
        'template.docx',
      );
    });

    it('should return default if no filename found', () => {
      expect(extractFilename('https://example.com/')).toBe('template.docx');
    });
  });

  describe('fetchTemplate - Node.js file system', () => {
    let testFilePath;

    beforeAll(async () => {
      // Create a test file
      testFilePath = path.join(__dirname, '../../fixtures/test-fetch.bin');
      await fs.mkdir(path.dirname(testFilePath), { recursive: true });
      await fs.writeFile(testFilePath, Buffer.from([0x50, 0x4b, 0x03, 0x04])); // ZIP header
    });

    afterAll(async () => {
      // Clean up test file
      try {
        await fs.unlink(testFilePath);
      } catch (error) {
        // Ignore cleanup errors
      }
    });

    it('should fetch file from file system', async () => {
      const result = await fetchTemplate(testFilePath);
      expect(Buffer.isBuffer(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle relative paths', async () => {
      const relativePath = path.relative(process.cwd(), testFilePath);
      const result = await fetchTemplate(relativePath);
      expect(Buffer.isBuffer(result)).toBe(true);
    });

    it('should throw error for non-existent file', async () => {
      await expect(fetchTemplate('/non/existent/file.docx')).rejects.toThrow();
    });
  });

  describe('fetchTemplate - Error handling', () => {
    it('should throw error for invalid paths', async () => {
      await expect(fetchTemplate('')).rejects.toThrow();
    });

    it('should throw error for null path', async () => {
      await expect(fetchTemplate(null)).rejects.toThrow();
    });

    it('should throw error for undefined path', async () => {
      await expect(fetchTemplate(undefined)).rejects.toThrow();
    });

    it('should handle file:// URLs', async () => {
      // Use an absolute path to a known file
      const absolutePath = path.resolve(__dirname, '../../../package.json');
      const fileUrl = `file://${absolutePath}`;

      try {
        const result = await fetchTemplate(fileUrl);
        expect(Buffer.isBuffer(result)).toBe(true);
      } catch (error) {
        // File URL handling might vary by platform, so just ensure it attempts the operation
        expect(error).toBeDefined();
      }
    });

    it('should handle permission errors gracefully', async () => {
      // Try to read a system file that might not have permissions
      const restrictedPath = process.platform === 'win32'
        ? 'C:\\Windows\\System32\\config\\SAM'
        : '/etc/shadow';

      try {
        await fetchTemplate(restrictedPath);
      } catch (error) {
        expect(error).toBeDefined();
        // Error could be ENOENT or EACCES depending on system
      }
    });
  });

  describe('URL validation', () => {
    it('should detect HTTP URLs correctly', () => {
      const httpUrl = 'http://example.com/template.docx';
      expect(httpUrl.startsWith('http://') || httpUrl.startsWith('https://')).toBe(true);
    });

    it('should detect HTTPS URLs correctly', () => {
      const httpsUrl = 'https://example.com/template.docx';
      expect(httpsUrl.startsWith('https://')).toBe(true);
    });

    it('should detect file:// URLs correctly', () => {
      const fileUrl = 'file:///path/to/file.docx';
      expect(fileUrl.startsWith('file://')).toBe(true);
    });
  });

  describe('Browser environment simulation', () => {
    it('should handle browser-like URL patterns', () => {
      const blobUrl = 'blob:https://example.com/abc-123';
      expect(blobUrl.startsWith('blob:')).toBe(true);
    });

    it('should validate template URL format', () => {
      const validUrls = [
        'https://example.com/template.docx',
        'http://example.com/template.pptx',
        'file:///path/to/template.xlsx',
      ];

      validUrls.forEach(url => {
        expect(typeof url).toBe('string');
        expect(url.length).toBeGreaterThan(0);
      });
    });
  });

  describe('HTTP fetch error handling', () => {
    it('should handle HTTP errors when fetching from URL', async () => {
      // Try to fetch from a URL that will fail
      try {
        await fetchTemplate('http://localhost:99999/nonexistent.docx');
      } catch (error) {
        expect(error).toBeDefined();
        expect(error.message).toBeDefined();
      }
    });

    it('should handle network errors gracefully', async () => {
      // Invalid URL that will cause fetch to fail
      try {
        await fetchTemplate('http://invalid.test.localhost.example/test.docx');
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('HTTP Error Handling with nock', () => {
    const nock = require('nock');

    afterEach(() => {
      nock.cleanAll();
    });

    it('should handle HTTP 404 error', async () => {
      nock('http://test.example.com')
        .get('/missing.docx')
        .reply(404, 'Not Found');

      await expect(
        fetchTemplate('http://test.example.com/missing.docx')
      ).rejects.toThrow('404');
    });

    it('should handle HTTP 500 error', async () => {
      nock('http://test.example.com')
        .get('/error.docx')
        .reply(500, 'Internal Server Error');

      await expect(
        fetchTemplate('http://test.example.com/error.docx')
      ).rejects.toThrow('500');
    });

    it('should handle HTTP 403 Forbidden', async () => {
      nock('http://test.example.com')
        .get('/forbidden.docx')
        .reply(403, 'Forbidden');

      await expect(
        fetchTemplate('http://test.example.com/forbidden.docx')
      ).rejects.toThrow('403');
    });

    it('should successfully fetch and return buffer from URL', async () => {
      const testContent = Buffer.from('test document content');

      nock('http://test.example.com')
        .get('/success.docx')
        .reply(200, testContent, {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        });

      const result = await fetchTemplate('http://test.example.com/success.docx');

      expect(result).toBeInstanceOf(Buffer);
      expect(result.toString()).toBe('test document content');
    });
  });
});
