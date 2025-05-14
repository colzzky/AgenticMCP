export default {
  preset: 'ts-jest/presets/default-esm',
  extensionsToTreatAsEsm: ['.ts'],
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.m?[tj]sx?$': [
      'ts-jest',
      {
        useESM: true,
      },
    ],
  },
  // Add the setup files for global mocks and ESM support
  setupFilesAfterEnv: ['./tests/jest.setup.js', './tests/jest-setup-esm.js'],

  // Exclude examples and mock files from test runs
  testMatch: ['**/tests/**/*.test.ts', '**/tests/**/*.spec.ts'],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/tests/examples/',
  ],

  moduleFileExtensions: ['ts', 'tsx', 'js', 'mjs', 'jsx', 'json', 'node'],
  // Ensure the SDK package is transformed by ts-jest
  transformIgnorePatterns: [
    '/node_modules/(?!(env-paths|keytar|@modelcontextprotocol/sdk))/',
    '\\.pnp\\.[^\\/]+$'
  ],
  // Collect coverage information
  collectCoverage: false, // Set to true when running coverage reports
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/index.ts'
  ],
  // Helpful flags
  verbose: true,
  detectOpenHandles: true, // Help identify hanging promises
  forceExit: true, // Force exit after tests complete

  // Run tests in isolation to prevent module conflicts
  maxWorkers: 1
};