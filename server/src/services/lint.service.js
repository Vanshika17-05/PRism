import { createRequire } from "node:module";
import { ESLint } from "eslint";
import { lintPythonFiles } from "./python.service.js";

const require = createRequire(import.meta.url);
const recommended = {
  extends: ["eslint:recommended"],
  env: { es2022: true, browser: true, node: true },
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    ecmaFeatures: { jsx: true },
  },
};
const jsLinter = new ESLint({ useEslintrc: false, baseConfig: recommended });
const tsLinter = new ESLint({
  useEslintrc: false,
  baseConfig: {
    ...recommended,
    parser: require.resolve("@typescript-eslint/parser"),
  },
});

async function lintJavaScript(files) {
  return Promise.all(
    files
      .filter((file) => ["js", "jsx", "ts", "tsx"].includes(file.language))
      .map(async (file) => {
        const linter = ["ts", "tsx"].includes(file.language)
          ? tsLinter
          : jsLinter;
        const [result] = await linter.lintText(file.content, {
          filePath: file.path,
        });
        return {
          path: file.path,
          lintErrors: result.messages
            .filter((message) => message.line)
            .map((message) => ({
              line: message.line,
              ruleId: message.ruleId || "parse-error",
              message: message.message,
              severity: message.severity === 2 ? "high" : "medium",
            })),
          complexityScore: null,
          maintainabilityIndex: null,
        };
      }),
  );
}

export async function lintFiles(files) {
  const [javascript, python] = await Promise.all([
    lintJavaScript(files),
    lintPythonFiles(files),
  ]);
  return [...javascript, ...python];
}

export function lintResultsToFindings(results) {
  return results.flatMap((result) =>
    result.lintErrors.map((error) => ({
      file: result.path,
      line: error.line,
      severity: error.severity,
      category: "maintainability",
      title: error.ruleId
        ? `Static analysis: ${error.ruleId}`
        : "Static analysis finding",
      body: error.message,
      suggestion: "",
      confidence: 100,
      source: "lint",
      posted: false,
    })),
  );
}
