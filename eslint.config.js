// @ts-check
import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";

const foundryGlobals = {
  game: "readonly",
  ui: "readonly",
  foundry: "readonly",
  CONFIG: "readonly",
  CONST: "readonly",
  Hooks: "readonly",
  canvas: "readonly",
  Actor: "readonly",
  ChatMessage: "readonly",
  fromUuid: "readonly",
};

const sharedTypeCheckedRules = {
  "@typescript-eslint/no-explicit-any": "error",
  "@typescript-eslint/ban-ts-comment": [
    "error",
    {
      "ts-ignore": true,
      "ts-nocheck": true,
      minimumDescriptionLength: 10,
    },
  ],
  "@typescript-eslint/consistent-type-imports": ["error", { prefer: "type-imports" }],
  "@typescript-eslint/no-unused-vars": [
    "error",
    { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
  ],
  "@typescript-eslint/restrict-template-expressions": "off",
  "@typescript-eslint/no-confusing-void-expression": "off",
  "@typescript-eslint/no-misused-promises": "off",
  "@typescript-eslint/require-await": "off",
  "@typescript-eslint/no-deprecated": "off",
  "@typescript-eslint/await-thenable": "off",
  "@typescript-eslint/no-unnecessary-condition": "off",
  "@typescript-eslint/no-unnecessary-type-conversion": "off",
  "@typescript-eslint/prefer-nullish-coalescing": "off",
  "@typescript-eslint/no-empty-object-type": "off",
  "@typescript-eslint/no-unnecessary-type-assertion": "off",
  "no-useless-assignment": "off",
};

export default tseslint.config(
  { ignores: ["dist/**", "node_modules/**"] },

  {
    files: ["src/**/*.{ts,tsx}"],
    extends: [
      js.configs.recommended,
      ...tseslint.configs.strictTypeChecked,
      ...tseslint.configs.stylisticTypeChecked,
    ],
    languageOptions: {
      globals: { ...globals.browser, ...foundryGlobals },
      parserOptions: {
        project: ["./tsconfig.json"],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: { "react-hooks": reactHooks },
    rules: {
      ...sharedTypeCheckedRules,
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
    },
  },

  {
    files: ["tests/**/*.ts"],
    extends: [...tseslint.configs.recommendedTypeChecked, ...tseslint.configs.stylisticTypeChecked],
    languageOptions: {
      globals: globals.node,
      parserOptions: {
        project: ["./tsconfig.test.json"],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      ...sharedTypeCheckedRules,
      "@typescript-eslint/no-floating-promises": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
    },
  }
);
