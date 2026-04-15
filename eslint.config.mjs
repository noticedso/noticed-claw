// eslint.config.mjs
import tsPlugin from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";

/** @type {import("eslint").Rule.RuleModule} */
const noDirectApiCallsInComponents = {
  meta: {
    type: "problem",
    messages: {
      noDirectApiCalls:
        "Components must not call API routes directly. Use a hook instead.",
    },
    schema: [],
  },
  create(context) {
    const filename = context.filename || context.getFilename();
    // Only apply to src/app/**/*.tsx, excluding hooks/
    if (!filename.includes("src/app/") || !filename.endsWith(".tsx")) {
      return {};
    }
    if (filename.includes("/hooks/")) return {};

    return {
      CallExpression(node) {
        const callee = node.callee;
        // Match fetch('/api...), axios('/api...), axios.get('/api...) etc.
        if (callee.type === "Identifier" && callee.name === "fetch") {
          const arg = node.arguments[0];
          if (
            arg &&
            arg.type === "Literal" &&
            typeof arg.value === "string" &&
            arg.value.startsWith("/api")
          ) {
            context.report({ node, messageId: "noDirectApiCalls" });
          }
        }
        if (
          callee.type === "Identifier" &&
          callee.name === "axios" &&
          node.arguments[0]?.type === "Literal" &&
          typeof node.arguments[0].value === "string" &&
          node.arguments[0].value.startsWith("/api")
        ) {
          context.report({ node, messageId: "noDirectApiCalls" });
        }
        if (
          callee.type === "MemberExpression" &&
          callee.object.type === "Identifier" &&
          callee.object.name === "axios" &&
          node.arguments[0]?.type === "Literal" &&
          typeof node.arguments[0].value === "string" &&
          node.arguments[0].value.startsWith("/api")
        ) {
          context.report({ node, messageId: "noDirectApiCalls" });
        }
      },
    };
  },
};

/** @type {import("eslint").Rule.RuleModule} */
const hooksMustUseIsServerPattern = {
  meta: {
    type: "problem",
    messages: {
      missingIsServer:
        "Hooks must import and check isServer to determine whether to call services directly or use fetch.",
    },
    schema: [],
  },
  create(context) {
    const filename = context.filename || context.getFilename();
    if (!filename.includes("src/hooks/") || !filename.endsWith(".ts")) {
      return {};
    }

    let hasIsServerImport = false;

    return {
      ImportDeclaration(node) {
        const source = node.source.value;
        for (const spec of node.specifiers) {
          if (
            spec.type === "ImportSpecifier" &&
            spec.imported.name === "isServer"
          ) {
            hasIsServerImport = true;
          }
        }
        // Also check default imports or namespace that reference isServer
        if (typeof source === "string" && source.includes("isServer")) {
          hasIsServerImport = true;
        }
      },
      VariableDeclarator(node) {
        // const isServer = typeof window === 'undefined'
        if (node.id.type === "Identifier" && node.id.name === "isServer") {
          hasIsServerImport = true;
        }
      },
      "Program:exit"(node) {
        if (!hasIsServerImport) {
          context.report({ node, messageId: "missingIsServer" });
        }
      },
    };
  },
};

/** @type {import("eslint").Rule.RuleModule} */
const servicesMustUseUnstableCache = {
  meta: {
    type: "problem",
    messages: {
      missingUnstableCache:
        "Service functions must use unstable_cache for server-side caching.",
    },
    schema: [],
  },
  create(context) {
    const filename = context.filename || context.getFilename();
    if (
      !filename.includes("src/lib/services/") ||
      !filename.endsWith(".ts")
    ) {
      return {};
    }

    let hasUnstableCacheRef = false;

    return {
      Identifier(node) {
        if (node.name === "unstable_cache") {
          hasUnstableCacheRef = true;
        }
      },
      "Program:exit"(node) {
        if (!hasUnstableCacheRef) {
          context.report({ node, messageId: "missingUnstableCache" });
        }
      },
    };
  },
};

/** @type {import("eslint").Rule.RuleModule} */
const noFetchInServicesHooksComponents = {
  meta: {
    type: "problem",
    messages: {
      noFetch:
        "Do not use bare fetch() in services, hooks, or components. Use the Supabase client instead.",
    },
    schema: [],
  },
  create(context) {
    const filename = context.filename || context.getFilename();
    const inScope =
      filename.includes("src/lib/") || filename.includes("src/hooks/");
    if (!inScope) return {};

    return {
      CallExpression(node) {
        if (
          node.callee.type === "Identifier" &&
          node.callee.name === "fetch"
        ) {
          context.report({ node, messageId: "noFetch" });
        }
      },
    };
  },
};

export default [
  {
    plugins: {
      custom: {
        rules: {
          "no-direct-api-calls-in-components": noDirectApiCallsInComponents,
          "no-fetch-in-services-hooks-components":
            noFetchInServicesHooksComponents,
          "hooks-must-use-is-server-pattern": hooksMustUseIsServerPattern,
          "services-must-use-unstable-cache": servicesMustUseUnstableCache,
        },
      },
    },
  },
  {
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
    },
    rules: {
      "custom/no-direct-api-calls-in-components": "error",
      "custom/no-fetch-in-services-hooks-components": "error",
      "custom/hooks-must-use-is-server-pattern": "error",
      "custom/services-must-use-unstable-cache": "error",
    },
  },
];
