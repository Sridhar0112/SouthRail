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

const reactHooks = {
  rules: {
    'rules-of-hooks': {
      create(context) {
        const functionName = (node) => node.id?.name
          || (node.parent?.type === 'VariableDeclarator' ? node.parent.id?.name : '')
          || (node.parent?.type === 'Property' ? node.parent.key?.name : '');
        return {
          CallExpression(node) {
            const hook = node.callee?.type === 'Identifier' ? node.callee.name : '';
            if (!/^use[A-Z0-9]/.test(hook)) return;
            let current = node.parent;
            let conditional = false;
            while (current && !/Function/.test(current.type)) {
              if (['IfStatement', 'ConditionalExpression', 'SwitchCase', 'ForStatement', 'ForInStatement', 'ForOfStatement', 'WhileStatement', 'DoWhileStatement'].includes(current.type)) conditional = true;
              current = current.parent;
            }
            const owner = current ? functionName(current) : '';
            if (!current || (!/^[A-Z]/.test(owner) && !/^use[A-Z0-9]/.test(owner))) {
              context.report({ node, message: `React Hook ${hook} must be called in a React component or custom Hook.` });
            } else if (conditional) {
              context.report({ node, message: `React Hook ${hook} must not be called conditionally or in a loop.` });
            }
          }
        };
      }
    },
    'exhaustive-deps': {
      create(context) {
        const dependencyRoot = (node) => {
          let current = node;
          while (current?.type === 'MemberExpression' || current?.type === 'ChainExpression') {
            current = current.type === 'ChainExpression' ? current.expression : current.object;
          }
          return current?.type === 'Identifier' ? current.name : '';
        };
        return {
          CallExpression(node) {
            const name = node.callee?.type === 'Identifier' ? node.callee.name : '';
            if (!['useEffect', 'useLayoutEffect', 'useCallback', 'useMemo'].includes(name)) return;
            if (node.arguments.length < 2) {
              context.report({ node, message: `${name} requires an explicit dependency array in this project.` });
            } else if (node.arguments[1].type !== 'ArrayExpression') {
              context.report({ node: node.arguments[1], message: `${name} dependency list must be an array literal.` });
            } else {
              const callback = node.arguments[0];
              if (!callback || !['ArrowFunctionExpression', 'FunctionExpression'].includes(callback.type)) return;
              const declared = new Set(node.arguments[1].elements.filter(Boolean).map(dependencyRoot).filter(Boolean));
              const scope = context.sourceCode.getScope(callback);
              const missing = new Set();
              for (const reference of scope.through) {
                const identifier = reference.identifier;
                const variable = reference.resolved;
                if (!variable || variable.scope?.type === 'module' || variable.scope?.type === 'global') continue;
                const initializedByRef = variable.defs?.some((definition) => definition.node?.init?.callee?.name === 'useRef');
                if (initializedByRef || /^set[A-Z]/.test(identifier.name) || /Ref$/.test(identifier.name)) continue;
                if (!declared.has(identifier.name)) missing.add(identifier.name);
              }
              if (missing.size) {
                context.report({ node: node.arguments[1], message: `${name} has missing dependencies: ${[...missing].sort().join(', ')}.` });
              }
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
    plugins: { 'jsx-uses-vars': jsxUsesVars, 'react-hooks': reactHooks },
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: {
        window: 'readonly', document: 'readonly', localStorage: 'readonly',
        sessionStorage: 'readonly', Blob: 'readonly', URL: 'readonly',
        React: 'readonly', setTimeout: 'readonly', clearTimeout: 'readonly',
        console: 'readonly', setInterval: 'readonly', clearInterval: 'readonly',
        URLSearchParams: 'readonly', Event: 'readonly', AbortController: 'readonly', alert: 'readonly'
      }
    },
    rules: {
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'jsx-uses-vars/uses-vars': 'error',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn'
    }
  }
];
