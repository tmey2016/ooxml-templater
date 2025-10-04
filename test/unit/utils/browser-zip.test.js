/**
 * Browser ZIP handler tests
 */

const BrowserZipHandler = require('../../../src/utils/browser-zip');

// Mock browser environment
const mockZipLib = {
  configure: jest.fn(),
  ZipReader: jest.fn(),
  ZipWriter: jest.fn(),
  BlobReader: jest.fn(),
  BlobWriter: jest.fn(),
  TextWriter: jest.fn(),
  TextReader: jest.fn(),
};

describe('BrowserZipHandler', () => {
  beforeEach(() => {
    BrowserZipHandler.clearCache();
    // Reset mocks
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    test('should initialize without zip.js library', () => {
      expect(BrowserZipHandler.zipLib).toBeNull();
    });

    test('should initialize with zip.js library when available', () => {
      // Mock window.zip
      global.window = { zip: mockZipLib };

      // Create new instance to test initialization
      const browserZip = new (require('../../../src/utils/browser-zip').constructor)();

      expect(browserZip.zipLib).toBe(mockZipLib);
      expect(mockZipLib.configure).toHaveBeenCalledWith({
        useWebWorkers: false,
      });

      // Cleanup
      delete global.window;
    });
  });

  describe('extract method', () => {
    test('should throw error when zip.js not available', async () => {
      await expect(BrowserZipHandler.extract('test.zip')).rejects.toThrow(
        'zip.js library not available'
      );
    });

    test('should handle blob extraction with zip.js', async () => {
      // Mock zip.js
      const mockEntries = [
        {
          directory: false,
          filename: 'test.xml',
          getData: jest
            .fn()
            .mockResolvedValueOnce('<xml>content</xml>')
            .mockResolvedValueOnce(new Blob(['<xml>content</xml>'])),
        },
      ];

      const mockZipReader = {
        getEntries: jest.fn().mockResolvedValue(mockEntries),
        close: jest.fn().mockResolvedValue(undefined),
      };

      mockZipLib.ZipReader.mockReturnValue(mockZipReader);
      mockZipLib.BlobReader.mockReturnValue({});
      mockZipLib.TextWriter.mockReturnValue({});
      mockZipLib.BlobWriter.mockReturnValue({});

      // Set up zip.js
      BrowserZipHandler.zipLib = mockZipLib;

      const testBlob = new Blob(['test zip content']);
      const result = await BrowserZipHandler.extract(testBlob);

      expect(result.files).toBeDefined();
      expect(result.files['test.xml']).toBeDefined();
      expect(result.files['test.xml'].content).toBe('<xml>content</xml>');
      expect(mockZipReader.close).toHaveBeenCalled();
    });
  });

  describe('create method', () => {
    test('should throw error when zip.js not available', async () => {
      // Ensure zipLib is null
      BrowserZipHandler.zipLib = null;

      await expect(BrowserZipHandler.create({})).rejects.toThrow('zip.js library not available');
    });

    test('should create ZIP with zip.js', async () => {
      const mockZipWriter = {
        add: jest.fn().mockResolvedValue(undefined),
        close: jest.fn().mockResolvedValue(new Blob(['zip content'])),
      };

      mockZipLib.ZipWriter.mockReturnValue(mockZipWriter);
      mockZipLib.BlobWriter.mockReturnValue({});
      mockZipLib.TextReader.mockReturnValue({});

      // Set up zip.js
      BrowserZipHandler.zipLib = mockZipLib;

      const fileStructure = {
        'test.xml': '<xml>content</xml>',
      };

      const result = await BrowserZipHandler.create(fileStructure);

      expect(result).toBeInstanceOf(Blob);
      expect(mockZipWriter.add).toHaveBeenCalledWith('test.xml', expect.anything());
      expect(mockZipWriter.close).toHaveBeenCalled();
    });
  });

  describe('downloadBlob method', () => {
    test('should throw error in non-browser environment', () => {
      const testBlob = new Blob(['test']);
      expect(() => BrowserZipHandler.downloadBlob(testBlob, 'test.zip')).toThrow(
        'downloadBlob is only available in browser environment'
      );
    });

    test('should trigger download in browser environment', () => {
      // Mock browser environment
      const mockLink = {
        href: '',
        download: '',
        click: jest.fn(),
      };

      global.window = {};
      global.document = {
        createElement: jest.fn().mockReturnValue(mockLink),
        body: {
          appendChild: jest.fn(),
          removeChild: jest.fn(),
        },
      };
      global.URL = {
        createObjectURL: jest.fn().mockReturnValue('blob:test-url'),
        revokeObjectURL: jest.fn(),
      };

      const testBlob = new Blob(['test']);
      BrowserZipHandler.downloadBlob(testBlob, 'test.zip');

      expect(global.document.createElement).toHaveBeenCalledWith('a');
      expect(mockLink.href).toBe('blob:test-url');
      expect(mockLink.download).toBe('test.zip');
      expect(mockLink.click).toHaveBeenCalled();
      expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('blob:test-url');

      // Cleanup
      delete global.window;
      delete global.document;
      delete global.URL;
    });
  });

  describe('caching', () => {
    test('should clear cache', () => {
      BrowserZipHandler.cache.set('test', 'data');
      expect(BrowserZipHandler.cache.size).toBe(1);

      BrowserZipHandler.clearCache();
      expect(BrowserZipHandler.cache.size).toBe(0);
    });
  });
});
