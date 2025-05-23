import eslintPluginUnicorn from 'eslint-plugin-unicorn';
import tseslint from 'typescript-eslint';

export default [
    {
      ignores: ['dist/**', 'node_modules/**', 'tests/**', '.prettierrc.js', 'jest.config.js'],
    },
		eslintPluginUnicorn.configs.recommended,
		{
      files: ['**/*.ts', '**/*.tsx'],
      languageOptions: {
        parser: tseslint.parser,
        parserOptions: {
          tsconfigRootDir: import.meta.dirname,
        },
      },
			rules: {
				'unicorn/better-regex': 'warn',
        'unicorn/prefer-module': 'off',
        'unicorn/text-encoding-identifier-case': 'off',
        'unicorn/prevent-abbreviations': 'off',
        'unicorn/filename-case': 'off',
        'max-lines': ["error", {"max": 350, "skipComments": true, "skipBlankLines": true}],
        'unicorn/no-useless-undefined': 'off',
        'unicorn/prefer-regexp-test': 'off'
			},
		},
];