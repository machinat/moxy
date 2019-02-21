module.exports = {
  parser: 'typescript-eslint-parser',
  env: {
    jest: true,
  },
  plugins: [
    'prettier',
    'typescript',
  ],
  extends: [
    'airbnb-base',
    'prettier',
  ],
  rules: {
    'no-undef': 0, // https://github.com/eslint/typescript-eslint-parser/issues/437
    'no-underscore-dangle': 0,
    'no-nested-ternary': 0,
    'no-return-assign': ['error', 'except-parens'],
    'no-restricted-syntax': ['error',
      'ForInStatement', 'LabeledStatement', 'WithStatement'
    ],
    'lines-between-class-members': ['error', 'always', {
      exceptAfterSingleLine: true,
    }],
    'prefer-arrow-callback': 0,
    'prettier/prettier': ['error', {
      trailingComma: 'es5',
      singleQuote: true,
    }],
    'import/extensions': 0,
    'no-use-before-define': 0,
    'typescript/no-unused-vars': 'error',
  },
  settings: {
    'import/resolver': {
      'typescript': {},
    },
  }
};
