import eslint from "@eslint/js";
import globals from "globals";
import obsidianmd from "eslint-plugin-obsidianmd";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["main.js", "node_modules", "eslint.config.js"] },
  eslint.configs.recommended,
  ...obsidianmd.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.ts"],
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
      globals: globals.browser,
    },
    rules: {
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/no-explicit-any": "error",
      "obsidianmd/ui/sentence-case": ["error", { "brands": ["Easy Spellcheck", "GitHub", "Hunspell", "LibreOffice", "Obsidian", "ZIP"] }]
    }
  }
);
