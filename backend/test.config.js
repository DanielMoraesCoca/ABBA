module.exports = {
    testEnvironment: 'node',
    coverageDirectory: 'coverage',
    collectCoverageFrom: [
      'src/**/*.js',
      '!src/**/*.test.js',
      '!**/node_modules/**'
    ],
    testMatch: [
      '**/tests/**/*.test.js',
      '**/tests/**/*.spec.js'
    ],
    verbose: true,
    testTimeout: 30000, // 30 seconds for integration tests
    coverageThreshold: {
      global: {
        branches: 60,
        functions: 70,
        lines: 70,
        statements: 70
      }
    }
  };