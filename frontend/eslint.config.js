import js from '@eslint/js';

// ESLint core does not count JSX element names as variable references. This
// small local rule keeps no-unused-vars accurate without external plug-ins.
const jsxUsesVars = {
  rules: {
    'uses-vars': {
      create(context) {
        return {
          JSXOpeningElement(node) {
            let name = node.name;
            while (name?.object) name = name.object;
            if (name?.type === 'JSXIdentifier' && /^[A-Z]/.test(name.name)) {
              context.sourceCode.markVariableAsUsed(name.name, node);
            }
          }
        };
      }
    }
  }
};

export default [
  { ignores: ['dist/**', 'node_modules/**'] },
  js.configs.recommended,
  {
    files: ['**/*.{js,jsx}'],
    plugins: { 'jsx-uses-vars': jsxUsesVars },
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: {
        window: 'readonly', document: 'readonly', localStorage: 'readonly',
        sessionStorage: 'readonly', Blob: 'readonly', URL: 'readonly',
        React: 'readonly', setTimeout: 'readonly', clearTimeout: 'readonly',
        console: 'readonly', setInterval: 'readonly', clearInterval: 'readonly',
        URLSearchParams: 'readonly', Event: 'readonly', alert: 'readonly'
      }
    },
    rules: {
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'jsx-uses-vars/uses-vars': 'error'
    }
  }
];
