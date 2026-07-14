import { FlatCompat } from "@eslint/eslintrc";
import js from "@eslint/js";
import pluginFormatjs from "eslint-plugin-formatjs";
import pluginImport from "eslint-plugin-import";
import pluginJest from "eslint-plugin-jest";
import pluginJsdoc from "eslint-plugin-jsdoc";
import eslintPluginPrettier from "eslint-plugin-prettier/recommended";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import { fileURLToPath } from "url";
import path from "path";
import globals from "globals";
import tseslint from "typescript-eslint";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const compat = new FlatCompat({ baseDirectory: __dirname });

export default tseslint.config(
  // Ignore patterns
  {
    ignores: [
      "dist",
      "coverage",
      "node_modules",
      "__mocks__/**/*",
      "eslint.config.js",
      "svgo.config.js",
      "jest.config.js",
      "setupTests.ts",
    ],
  },

  js.configs.recommended,

  // TypeScript recommended + type-checked + strict
  ...tseslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  ...tseslint.configs.strict,

  // Airbnb style guide (legacy config via compat bridge)
  ...compat.extends("airbnb", "airbnb-typescript", "airbnb/hooks"),

  // Main rules for all source files
  {
    files: ["**/*.{ts,tsx,js,jsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.es2021,
      },
      parserOptions: {
        project: true,
        cacheLifetime: { glob: Infinity },
      },
    },
    plugins: {
      "simple-import-sort": simpleImportSort,
      import: pluginImport,
      formatjs: pluginFormatjs,
      jsdoc: pluginJsdoc,
    },
    rules: {
      // =====================
      // React-Specific Rules
      // =====================
      "react/jsx-no-useless-fragment": ["warn", { allowExpressions: true }],
      "react/prop-types": "off",
      "react/jsx-filename-extension": "off",
      "react/jsx-curly-spacing": [
        "error",
        { when: "never", allowMultiline: true },
      ],
      "react/jsx-curly-brace-presence": [
        "error",
        { props: "never", children: "never", propElementValues: "always" },
      ],
      "react/jsx-curly-newline": [
        "error",
        { multiline: "consistent", singleline: "consistent" },
      ],
      "react/jsx-wrap-multilines": [
        "error",
        {
          declaration: "parens",
          assignment: "parens",
          return: "parens",
          arrow: "parens",
          condition: "parens",
          logical: "parens",
          prop: "ignore",
        },
      ],

      // =====================
      // JSDoc Rules
      // =====================
      "jsdoc/require-jsdoc": ["warn", { publicOnly: true }],
      "jsdoc/require-description": "warn",

      // =====================
      // TypeScript-Specific Rules
      // =====================
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],
      "@typescript-eslint/consistent-type-exports": [
        "error",
        { fixMixedExportsWithInlineTypeSpecifier: true },
      ],
      "@typescript-eslint/consistent-type-definitions": "error",
      "@typescript-eslint/no-invalid-void-type": "off",
      "@typescript-eslint/switch-exhaustiveness-check": "error",
      "@typescript-eslint/no-use-before-define": "off",

      // =====================
      // Import Rules
      // =====================
      "import/extensions": [
        "error",
        "ignorePackages",
        { js: "never", jsx: "never", ts: "never", tsx: "never" },
      ],
      "import/no-unresolved": [0, { caseSensitive: false }],
      "import/first": "error",
      "import/no-cycle": "off",
      "import/no-extraneous-dependencies": [
        "warn",
        {
          packageDir: [__dirname],
          devDependencies: [
            "**/__tests__/**/*.[jt]s?(x)",
            "**/?(*.)+(spec|test).[jt]s?(x)",
            "jest.setup.js",
          ],
        },
      ],
      "import/newline-after-import": "error",
      "import/no-duplicates": "error",
      "import/prefer-default-export": "warn",

      // =====================
      // Import Sorting Rules
      // =====================
      "simple-import-sort/imports": [
        "error",
        {
          groups: [
            ["^react", "^@?\\w"],
            ["^(@|components)(/.*|$)"],
            ["^\\u0000"],
            ["^\\.\\.(?!/?$)", "^\\.\\./?$"],
            ["^\\./(?=.*/)(?!/?$)", "^\\.(?!/?$)", "^\\./?$"],
            ["^.+\\.?(css)$"],
          ],
        },
      ],
      "simple-import-sort/exports": "error",
      "import/order": "off",

      // =====================
      // Code Style Rules
      // =====================
      curly: ["error", "all"],
      "object-curly-newline": ["error", { multiline: true, consistent: true }],
      "object-curly-spacing": ["error", "always"],
      "comma-spacing": ["error", { before: false, after: true }],
      "space-in-parens": ["error", "never"],
      "padded-blocks": ["error", "never"],

      // =====================
      // Whitespace & Formatting Rules
      // =====================
      "no-multiple-empty-lines": ["error", { max: 1, maxBOF: 0, maxEOF: 1 }],
      "lines-between-class-members": [
        "error",
        "always",
        { exceptAfterSingleLine: true },
      ],
      "newline-after-var": ["error", "always"],
      "newline-before-return": "error",
      "padding-line-between-statements": [
        "warn",
        { blankLine: "always", prev: "*", next: "block" },
        { blankLine: "always", prev: "block", next: "*" },
        { blankLine: "always", prev: "*", next: "block-like" },
        { blankLine: "always", prev: "block-like", next: "*" },
      ],

      // =====================
      // Best Practices & Miscellaneous
      // =====================
      "no-param-reassign": "off",
      "default-case": "off",
      "no-unused-vars": "error",
      "no-underscore-dangle": "off",
      "no-warning-comments": "error",
      "prefer-arrow-callback": "off",

      // =====================
      // FormatJS / i18n Rules
      // =====================
      "formatjs/enforce-id": [
        "error",
        { idInterpolationPattern: "[sha512:contenthash:base64:6]" },
      ],
      "formatjs/enforce-default-message": "error",
      "formatjs/no-literal-string-in-jsx": "error",
    },
  },

  // Test file overrides (via compat for legacy plugin configs)
  ...compat
    .extends(
      "plugin:jest/recommended",
      "plugin:jest-dom/recommended",
      "plugin:testing-library/react"
    )
    .map((config) => ({
      ...config,
      files: [
        "**/__tests__/**/*.[jt]s?(x)",
        "**/?(*.)+(spec|test).[jt]s?(x)",
      ],
    })),
  {
    files: [
      "**/__tests__/**/*.[jt]s?(x)",
      "**/?(*.)+(spec|test).[jt]s?(x)",
    ],
    languageOptions: {
      globals: {
        ...pluginJest.environments.globals.globals,
      },
    },
    rules: {
      "formatjs/no-literal-string-in-jsx": "off",
    },
  },

  // index.ts / exports.ts overrides
  {
    files: ["**/index.ts", "**/exports.ts"],
    rules: {
      "simple-import-sort/imports": "off",
      "simple-import-sort/exports": "off",
      "import/first": "off",
      "import/order": "off",
      "import/newline-after-import": "off",
      "newline-after-var": "off",
    },
  },

  // CSS module type definitions
  {
    files: ["*.module.css.d.ts"],
    rules: {
      "newline-after-var": "off",
    },
  },

  // Prettier must be last to override any conflicting formatting rules
  eslintPluginPrettier
);
