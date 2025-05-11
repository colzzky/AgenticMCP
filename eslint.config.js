import eslintPluginUnicorn from 'eslint-plugin-unicorn';
import tseslint from 'typescript-eslint';

export default [
    {
      ignores: ['dist/**', 'node_modules/**', 'tests/index.test.ts', '.prettierrc.js', 'jest.config.js'],
    },
		eslintPluginUnicorn.configs.recommended,
		{
      files: ['**/*.ts', '**/*.tsx'],
      languageOptions: {
        parser: tseslint.parser,
        parserOptions: {
          tsconfigRootDir: import.meta.dirname + "/src",
        },
      },
			rules: {
				'unicorn/better-regex': 'warn',
        'unicorn/prefer-module': 'off',
        'unicorn/text-encoding-identifier-case': 'off',
        'unicorn/prevent-abbreviations': 'off',
        'unicorn/filename-case': 'off',
			},
		},
];