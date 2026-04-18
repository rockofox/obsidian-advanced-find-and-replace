import ts from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import obsidianmd from 'eslint-plugin-obsidianmd';

export default [
  ...obsidianmd.configs.recommended,

  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: import.meta.dirname,
      },
      globals: {
        NodeJS: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': ts,
    },
    rules: {
      ...ts.configs.recommended.rules,

      // Obsidian rules at error level
      'obsidianmd/no-sample-code': 'error',
      'obsidianmd/validate-manifest': 'error',
      'obsidianmd/no-plugin-as-component': 'error',
      'obsidianmd/no-view-references-in-plugin': 'error',
      'obsidianmd/vault/iterate': 'error',
      'obsidianmd/prefer-file-manager-trash-file': 'error',

      // Sentence case with auto-fix
      'obsidianmd/ui/sentence-case': ['warn', {
        brands: ['GitHub', 'Obsidian'],
        acronyms: ['API', 'URL', 'ID', 'HTML', 'CSS', 'JSON'],
        enforceCamelCaseLower: true,
        allowAutoFix: true,
      }],

      // Best practices at warn level
      'obsidianmd/commands/no-default-hotkeys': 'warn',
      'obsidianmd/no-static-styles-assignment': 'warn',
      'obsidianmd/object-assign': 'warn',

      // Disable rules that are too aggressive
      'obsidianmd/sample-names': 'off',
		'obsidianmd/prefer-active-doc': 'off',
		'obsidianmd/prefer-active-window-timers': 'off',

      // TypeScript rules
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },

  // Test files - disable obsidian rules and strict TS checks
  {
    files: ['**/*.test.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-floating-promises': 'off',
      'obsidianmd/prefer-active-doc': 'off',
      'obsidianmd/prefer-active-window-timers': 'off',
      'obsidianmd/no-unsupported-api': 'off',
    },
    languageOptions: {
      globals: {
        global: 'readonly',
      },
    },
  },
];
