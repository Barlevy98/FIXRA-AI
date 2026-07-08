module.exports = {
    root: true,
    env: {
      node: true,
      es2021: true,
    },
    parser: '@typescript-eslint/parser',
    plugins: ['@typescript-eslint'],
    extends: [
      'eslint:recommended',
      'plugin:@typescript-eslint/recommended',
    ],
    ignorePatterns: ['node_modules/', '.expo/', 'dist/', 'babel.config.js'],
    rules: {
      // Mute type and variable errors to allow smooth workflow for now
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-var-requires': 'off',
      'prefer-const': 'off',
      'no-empty': 'off',
      'no-undef': 'off',
  
      // Ironclad rule: strictly forbid direct DB access from UI components
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@supabase/supabase-js',
              message: 'STOP! Direct database access from UI components is forbidden. Use the DAL functions in db.ts instead.'
            }
          ],
          patterns: [
            {
              group: ['**/supabase'],
              message: 'Do not import Supabase config directly into UI. Use db.ts.'
            }
          ]
        }
      ]
    },
    overrides: [
      {
        // The exception: allow DB access only in our infrastructure and test files
        files: ['**/db.ts', '**/supabase.ts', '**/*.test.ts'],
        rules: {
          'no-restricted-imports': 'off'
        }
      }
    ]
  };