export default {
  preset: 'ts-jest/presets/default-esm',
  extensionsToTreatAsEsm: ['.ts'],
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@/(.*)$': '<rootDir>/src/$1',
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^../../src/tools/toolRegistry$': '<rootDir>/__mocks__/src/tools/tool-registry.js',
    '^../../src/core/config/configManager$': '<rootDir>/__mocks__/src/core/config/config-manager.js',
    '^../../src/providers/openai/openaiProvider$': '<rootDir>/__mocks__/src/providers/openai/openai-provider.js',
    '^../../src/providers/anthropic/anthropicProvider$': '<rootDir>/__mocks__/src/providers/anthropic/anthropic-provider.js',
    '^../../src/tools/toolExecutor$': '<rootDir>/__mocks__/src/tools/tool-executor.js',
  },
  transform: {
    '^.+\\.m?[tj]sx?$': [
      'ts-jest',
      {
        useESM: true,
      },
    ],
  },
  testMatch: ['**/tests/**/*.test.ts', '**/tests/**/*.spec.ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'mjs', 'jsx', 'json', 'node'],
  transformIgnorePatterns: [
    '/node_modules/(?!(env-paths|keytar))/', 
    '\\.pnp\\.[^\\/]+$'
  ],
  setupFilesAfterEnv: ['./tests/jest.setup.ts'],
};
