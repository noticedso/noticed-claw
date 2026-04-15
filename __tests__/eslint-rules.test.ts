// __tests__/eslint-rules.test.ts
import { describe, it, expect, beforeAll } from "vitest";
import { Linter } from "eslint";

describe("ESLint architecture rules", () => {
  let linter: Linter;
  let config: any[];

  beforeAll(async () => {
    const configModule = await import("../eslint.config.mjs");
    config = configModule.default;
    linter = new Linter({ configType: "flat" });
  });

  it("no-direct-api-calls-in-components: flags fetch('/api') in component files", () => {
    const code = `
      export default function MyComponent() {
        fetch('/api/data').then(r => r.json());
        return null;
      }
    `;

    const messages = linter.verify(code, config, {
      filename: "src/app/dashboard/page.tsx",
    });

    const ruleIds = messages.map((m) => m.ruleId);
    expect(ruleIds).toContain("custom/no-direct-api-calls-in-components");
  });

  it("no-direct-api-calls-in-components: allows fetch in hooks", () => {
    const code = `
      export function useData() {
        return fetch('/api/data').then(r => r.json());
      }
    `;

    const messages = linter.verify(code, config, {
      filename: "src/hooks/useData.ts",
    });

    const ruleIds = messages.map((m) => m.ruleId);
    expect(ruleIds).not.toContain("custom/no-direct-api-calls-in-components");
  });

  it("no-fetch-in-services-hooks-components: flags bare fetch() in services", () => {
    const code = `
      export async function getUsers() {
        const res = await fetch('https://example.com/users');
        return res.json();
      }
    `;

    const messages = linter.verify(code, config, {
      filename: "src/lib/services/users.ts",
    });

    const ruleIds = messages.map((m) => m.ruleId);
    expect(ruleIds).toContain("custom/no-fetch-in-services-hooks-components");
  });

  it("no-fetch-in-services-hooks-components: flags bare fetch() in hooks", () => {
    const code = `
      export function useProfiles() {
        return fetch('/profiles').then(r => r.json());
      }
    `;

    const messages = linter.verify(code, config, {
      filename: "src/hooks/useProfiles.ts",
    });

    const ruleIds = messages.map((m) => m.ruleId);
    expect(ruleIds).toContain("custom/no-fetch-in-services-hooks-components");
  });

  it("hooks-must-use-is-server-pattern: flags hooks without isServer", () => {
    const code = `
      export function useProfile() {
        return { data: null };
      }
    `;

    const messages = linter.verify(code, config, {
      filename: "src/hooks/useProfile.ts",
    });

    const ruleIds = messages.map((m) => m.ruleId);
    expect(ruleIds).toContain("custom/hooks-must-use-is-server-pattern");
  });

  it("hooks-must-use-is-server-pattern: allows hooks with isServer", () => {
    const code = `
      const isServer = typeof window === 'undefined';
      export function useProfile() {
        if (isServer) return null;
        return { data: null };
      }
    `;

    const messages = linter.verify(code, config, {
      filename: "src/hooks/useProfile.ts",
    });

    const ruleIds = messages.map((m) => m.ruleId);
    expect(ruleIds).not.toContain("custom/hooks-must-use-is-server-pattern");
  });

  it("services-must-use-unstable-cache: flags services without unstable_cache", () => {
    const code = `
      export async function getUsers() {
        return [];
      }
    `;

    const messages = linter.verify(code, config, {
      filename: "src/lib/services/users.ts",
    });

    const ruleIds = messages.map((m) => m.ruleId);
    expect(ruleIds).toContain("custom/services-must-use-unstable-cache");
  });

  it("services-must-use-unstable-cache: allows services with unstable_cache", () => {
    const code = `
      import { unstable_cache } from 'next/cache';
      export const getUsers = unstable_cache(async () => {
        return [];
      }, ['users']);
    `;

    const messages = linter.verify(code, config, {
      filename: "src/lib/services/users.ts",
    });

    const ruleIds = messages.map((m) => m.ruleId);
    expect(ruleIds).not.toContain("custom/services-must-use-unstable-cache");
  });
});
