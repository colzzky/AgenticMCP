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
  // Add the setup file for global mocks
  setupFilesAfterEnv: ['./tests/jest.setup.js'],
  testMatch: ['**/tests/**/*.test.ts', '**/tests/**/*.spec.ts'],
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
  forceExit: true // Force exit after tests complete
};
