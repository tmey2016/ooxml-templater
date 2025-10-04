module.exports = {
  // Test environment
  testEnvironment: 'node',

  // Test file patterns
  testMatch: ['<rootDir>/test/**/*.test.js', '<rootDir>/test/**/*.spec.js'],

  // Coverage configuration
  collectCoverage: true,
  collectCoverageFrom: ['src/**/*.js', '!src/**/*.test.js', '!src/**/*.spec.js'],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],

  // Module resolution
  moduleDirectories: ['node_modules', 'src'],

  // Transform configuration
  transform: {
    '^.+\\.js$': 'babel-jest',
  },

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/test/setup.js'],

  // Test timeout
  testTimeout: 10000,

  // Verbose output
  verbose: true,

  // Clear mocks between tests
  clearMocks: true,

  // Restore mocks after each test
  restoreMocks: true,
};
