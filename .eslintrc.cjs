module.exports = {
  parser: '@typescript-eslint/parser',
  env: {
    jest: true,
  },
  plugins: ['prettier', '@typescript-eslint'],
  extends: [
    'airbnb-base',
    'plugin:prettier/recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:import/typescript',
  ],
  rules: {
    'no-underscore-dangle': 0,
    'no-dupe-class-members': 0,
    'no-nested-ternary': 0,
    'no-return-assign': ['error', 'except-parens'],
    'no-restricted-syntax': [
      'error',
      'ForInStatement',
      'LabeledStatement',
      'WithStatement',
    ],
    'lines-between-class-members': [
      'error',
      'always',
      { exceptAfterSingleLine: true },
    ],
    'prefer-arrow-callback': 0,
    'import/prefer-default-export': 0,
    'import/extensions': 0,
    '@typescript-eslint/indent': 0,
    '@typescript-eslint/no-explicit-any': 0,
    '@typescript-eslint/explicit-function-return-type': 0,
    '@typescript-eslint/no-empty-function': 'off',
  },
  overrides: [
    {
      files: '**/__{tests,fixtures,mocks}__/*',
      rules: {
        'import/no-extraneous-dependencies': 'off',
        '@typescript-eslint/no-non-null-assertion': 'off',
        'max-classes-per-file': 'off',
      },
    },
  ],
  settings: {
    'import/parsers': {
      '@typescript-eslint/parser': ['.ts', '.tsx'],
    },
    'import/resolver': {
      typescript: {},
    },
  },
};
