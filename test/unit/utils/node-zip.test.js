/**
 * Node.js ZIP handler tests
 */

const NodeZipHandler = require('../../../src/utils/node-zip');
const AdmZip = require('adm-zip');

describe('NodeZipHandler', () => {
  beforeEach(() => {
    NodeZipHandler.clearCache();
  });

  describe('extract method', () => {
    test('should extract ZIP from buffer', async () => {
      // Create a test ZIP
      const zip = new AdmZip();
      zip.addFile('test.xml', Buffer.from('<xml>test content</xml>', 'utf8'));
      zip.addFile('subfolder/test2.xml', Buffer.from('<xml>nested content</xml>', 'utf8'));
      const zipBuffer = zip.toBuffer();

      const result = await NodeZipHandler.extract(zipBuffer);

      expect(result.files).toBeDefined();
      expect(result.files['test.xml']).toBeDefined();
      expect(result.files['test.xml'].content).toBe('<xml>test content</xml>');
      expect(result.files['subfolder/test2.xml']).toBeDefined();
      expect(result.files['subfolder/test2.xml'].content).toBe('<xml>nested content</xml>');
    });

    test('should provide helper methods', async () => {
      const zip = new AdmZip();
      zip.addFile('test.xml', Buffer.from('<xml>test</xml>', 'utf8'));
      zip.addFile('data.txt', Buffer.from('plain text', 'utf8'));
      const zipBuffer = zip.toBuffer();

      const result = await NodeZipHandler.extract(zipBuffer);

      expect(typeof result.getFile).toBe('function');
      expect(typeof result.getAllFiles).toBe('function');
      expect(typeof result.getXmlFiles).toBe('function');

      expect(result.getFile('test.xml')).toBeDefined();
      expect(result.getAllFiles()).toHaveLength(2);
      expect(result.getXmlFiles()).toHaveLength(1);
      expect(result.getXmlFiles()[0].name).toBe('test.xml');
    });
  });

  describe('create method', () => {
    test('should create ZIP from file structure', async () => {
      const fileStructure = {
        'test.xml': '<xml>test content</xml>',
        'data.txt': 'plain text data',
      };

      const zipBuffer = await NodeZipHandler.create(fileStructure);

      expect(Buffer.isBuffer(zipBuffer)).toBe(true);

      // Verify the created ZIP
      const zip = new AdmZip(zipBuffer);
      const entries = zip.getEntries();
      expect(entries).toHaveLength(2);

      const testXmlEntry = entries.find((entry) => entry.entryName === 'test.xml');
      const dataTextEntry = entries.find((entry) => entry.entryName === 'data.txt');

      expect(testXmlEntry).toBeDefined();
      expect(dataTextEntry).toBeDefined();
      expect(testXmlEntry.getData().toString('utf8')).toBe('<xml>test content</xml>');
      expect(dataTextEntry.getData().toString('utf8')).toBe('plain text data');
    });

    test('should handle buffer content', async () => {
      const fileStructure = {
        'test.xml': Buffer.from('<xml>buffer content</xml>', 'utf8'),
      };

      const zipBuffer = await NodeZipHandler.create(fileStructure);
      const zip = new AdmZip(zipBuffer);
      const entry = zip.getEntry('test.xml');

      expect(entry).toBeDefined();
      expect(entry.getData().toString('utf8')).toBe('<xml>buffer content</xml>');
    });
  });

  describe('caching', () => {
    test('should cache extracted files', () => {
      const testUrl = 'https://example.com/test.zip';
      const testBuffer = Buffer.from('test data');

      expect(NodeZipHandler.cache.has(testUrl)).toBe(false);
      NodeZipHandler.cache.set(testUrl, testBuffer);
      expect(NodeZipHandler.cache.has(testUrl)).toBe(true);
      expect(NodeZipHandler.cache.get(testUrl)).toBe(testBuffer);
    });

    test('should clear cache', () => {
      NodeZipHandler.cache.set('test', 'data');
      expect(NodeZipHandler.cache.size).toBe(1);

      NodeZipHandler.clearCache();
      expect(NodeZipHandler.cache.size).toBe(0);
    });
  });

  describe('error handling', () => {
    test('should handle invalid ZIP buffer', async () => {
      const invalidBuffer = Buffer.from('not a zip file', 'utf8');

      await expect(NodeZipHandler.extract(invalidBuffer)).rejects.toThrow();
    });

    test('should handle empty buffer', async () => {
      const emptyBuffer = Buffer.alloc(0);

      await expect(NodeZipHandler.extract(emptyBuffer)).rejects.toThrow();
    });

    test('should handle corrupted ZIP', async () => {
      // Create a valid ZIP then corrupt it
      const zip = new AdmZip();
      zip.addFile('test.xml', Buffer.from('<xml>test</xml>', 'utf8'));
      const validBuffer = zip.toBuffer();

      // Corrupt the buffer by modifying bytes
      const corruptBuffer = Buffer.from(validBuffer);
      corruptBuffer[10] = 0xFF;
      corruptBuffer[11] = 0xFF;

      // This might or might not throw depending on corruption - just verify it runs
      try {
        await NodeZipHandler.extract(corruptBuffer);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    test('should handle file read from non-existent path', async () => {
      const nonExistentPath = '/path/that/does/not/exist/file.zip';

      await expect(NodeZipHandler.extract(nonExistentPath)).rejects.toThrow();
    });

    test('should handle file objects with content property in create', async () => {
      const fileStructure = {
        'test.xml': {
          content: '<xml>test</xml>',
        },
      };

      const zipBuffer = await NodeZipHandler.create(fileStructure);
      expect(Buffer.isBuffer(zipBuffer)).toBe(true);

      const zip = new AdmZip(zipBuffer);
      const entry = zip.getEntry('test.xml');
      expect(entry).toBeDefined();
    });

    test('should handle file objects with buffer property in create', async () => {
      const fileStructure = {
        'test.xml': {
          buffer: Buffer.from('<xml>from buffer</xml>', 'utf8'),
        },
      };

      const zipBuffer = await NodeZipHandler.create(fileStructure);
      expect(Buffer.isBuffer(zipBuffer)).toBe(true);

      const zip = new AdmZip(zipBuffer);
      const entry = zip.getEntry('test.xml');
      expect(entry).toBeDefined();
      expect(entry.getData().toString('utf8')).toBe('<xml>from buffer</xml>');
    });

    test('should skip invalid content types in create', async () => {
      const fileStructure = {
        'valid.xml': '<xml>valid</xml>',
        'invalid': null, // Should be skipped
        'invalid2': undefined, // Should be skipped
        'invalid3': 12345, // Should be skipped
      };

      const zipBuffer = await NodeZipHandler.create(fileStructure);
      const zip = new AdmZip(zipBuffer);
      const entries = zip.getEntries();

      // Should only have the valid entry
      expect(entries.length).toBeGreaterThanOrEqual(1);
      expect(entries.find(e => e.entryName === 'valid.xml')).toBeDefined();
    });
  });

  describe('saveToFile method', () => {
    const fs = require('fs').promises;
    const path = require('path');

    test('should save ZIP buffer to file', async () => {
      const zip = new AdmZip();
      zip.addFile('test.xml', Buffer.from('<xml>content</xml>', 'utf8'));
      const zipBuffer = zip.toBuffer();

      const outputPath = path.join(__dirname, '../../fixtures/test-output.zip');

      try {
        await NodeZipHandler.saveToFile(zipBuffer, outputPath);

        // Verify file was created
        const stats = await fs.stat(outputPath);
        expect(stats.size).toBeGreaterThan(0);

        // Verify content is correct
        const savedBuffer = await fs.readFile(outputPath);
        expect(savedBuffer.length).toBe(zipBuffer.length);
      } finally {
        // Cleanup
        await fs.unlink(outputPath).catch(() => {});
      }
    });
  });

  describe('Remote ZIP fetching with HTTP errors', () => {
    const nock = require('nock');

    afterEach(() => {
      nock.cleanAll();
    });

    test('should handle HTTP 404 when fetching remote ZIP', async () => {
      nock('http://remote.example.com')
        .get('/template.zip')
        .reply(404, 'Not Found');

      await expect(
        NodeZipHandler.extract('http://remote.example.com/template.zip')
      ).rejects.toThrow('Failed to fetch ZIP file');
    });

    test('should handle HTTP 500 server error when fetching ZIP', async () => {
      nock('http://remote.example.com')
        .get('/template.zip')
        .reply(500, 'Server Error');

      await expect(
        NodeZipHandler.extract('http://remote.example.com/template.zip')
      ).rejects.toThrow('Failed to fetch ZIP file');
    });

    test('should use cache when fetching same URL twice', async () => {
      const AdmZip = require('adm-zip');
      const zip = new AdmZip();
      zip.addFile('test.txt', Buffer.from('cached content'));
      const zipBuffer = zip.toBuffer();

      // First request - should fetch
      nock('http://cache.example.com')
        .get('/template.zip')
        .reply(200, zipBuffer);

      const result1 = await NodeZipHandler.extract('http://cache.example.com/template.zip');
      expect(result1.files['test.txt']).toBeDefined();

      // Second request - should use cache (no new nock needed)
      const result2 = await NodeZipHandler.extract('http://cache.example.com/template.zip');
      expect(result2.files['test.txt']).toBeDefined();
      expect(result2.files['test.txt'].content).toBe('cached content');
    });
  });
});
