/**
 * Jest setup file
 * Global test configuration and setup
 */

// Global test timeout for Office document processing
jest.setTimeout(30000);

// Mock console methods for cleaner test output
global.console = {
  ...console,
  // Uncomment to suppress console.log during tests
  // log: jest.fn(),
  // warn: jest.fn(),
  // error: jest.fn(),
};

// Global test utilities
global.testUtils = {
  // Helper function to create test Office document paths
  getTestDocumentPath: (filename) => {
    const path = require('path');
    return path.join(__dirname, 'fixtures', filename);
  },

  // Helper function to read test files
  readTestFile: async (filename) => {
    const fs = require('fs').promises;
    const path = require('path');
    return await fs.readFile(path.join(__dirname, 'fixtures', filename));
  },
};

// Environment detection for tests
global.isNode = typeof window === 'undefined' && typeof global !== 'undefined';
global.isBrowser = typeof window !== 'undefined';
