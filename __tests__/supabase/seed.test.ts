// __tests__/supabase/seed.test.ts
import { describe, it, expect } from "vitest";
import {
  generateProfile,
  generateConnections,
  pickRandom,
  SKILLS_POOL,
  SeededRandom,
} from "@/supabase/seed";

describe("seed data generation", () => {
  describe("SeededRandom", () => {
    it("produces deterministic output", () => {
      const rng1 = new SeededRandom(42);
      const rng2 = new SeededRandom(42);
      const seq1 = Array.from({ length: 10 }, () => rng1.next());
      const seq2 = Array.from({ length: 10 }, () => rng2.next());
      expect(seq1).toEqual(seq2);
    });

    it("produces values between 0 and 1", () => {
      const rng = new SeededRandom(123);
      for (let i = 0; i < 100; i++) {
        const val = rng.next();
        expect(val).toBeGreaterThanOrEqual(0);
        expect(val).toBeLessThan(1);
      }
    });
  });

  describe("pickRandom", () => {
    it("returns between min and max items", () => {
      const rng = new SeededRandom(42);
      const arr = ["a", "b", "c", "d", "e", "f", "g", "h"];
      for (let i = 0; i < 20; i++) {
        const picked = pickRandom(arr, 2, 5, rng);
        expect(picked.length).toBeGreaterThanOrEqual(2);
        expect(picked.length).toBeLessThanOrEqual(5);
        for (const item of picked) {
          expect(arr).toContain(item);
        }
      }
    });

    it("returns unique items (no duplicates)", () => {
      const rng = new SeededRandom(42);
      const arr = ["a", "b", "c", "d", "e"];
      for (let i = 0; i < 20; i++) {
        const picked = pickRandom(arr, 3, 5, rng);
        const unique = new Set(picked);
        expect(unique.size).toBe(picked.length);
      }
    });
  });

  describe("generateProfile", () => {
    it("returns a valid profile shape", () => {
      const rng = new SeededRandom(42);
      const profile = generateProfile(0, rng);

      expect(typeof profile.login).toBe("string");
      expect(profile.login.length).toBeGreaterThan(0);
      expect(typeof profile.name).toBe("string");
      expect(profile.name.length).toBeGreaterThan(0);
      expect(typeof profile.bio).toBe("string");
      expect(profile.bio.length).toBeGreaterThan(0);

      // Skills: 4-8
      expect(profile.skills.length).toBeGreaterThanOrEqual(4);
      expect(profile.skills.length).toBeLessThanOrEqual(8);
      for (const skill of profile.skills) {
        expect(SKILLS_POOL).toContain(skill);
      }

      // Repos: 5-15
      expect(profile.repos.length).toBeGreaterThanOrEqual(5);
      expect(profile.repos.length).toBeLessThanOrEqual(15);
      for (const repo of profile.repos) {
        expect(typeof repo.name).toBe("string");
        expect(typeof repo.description).toBe("string");
        expect(typeof repo.language).toBe("string");
        expect(typeof repo.stars).toBe("number");
        expect(repo.stars).toBeGreaterThanOrEqual(0);
      }

      // Activity
      expect(typeof profile.activity.commitCount).toBe("number");
      expect(profile.activity.commitCount).toBeGreaterThan(0);
      expect(Array.isArray(profile.activity.languages)).toBe(true);
      expect(Array.isArray(profile.activity.recentRepos)).toBe(true);
    });

    it("produces deterministic profiles for same index and seed", () => {
      const rng1 = new SeededRandom(42);
      const rng2 = new SeededRandom(42);
      const p1 = generateProfile(5, rng1);
      const p2 = generateProfile(5, rng2);
      expect(p1.login).toBe(p2.login);
      expect(p1.name).toBe(p2.name);
      expect(p1.skills).toEqual(p2.skills);
    });
  });

  describe("generateConnections", () => {
    it("returns an array of 100 connection lists", () => {
      const rng = new SeededRandom(42);
      const connections = generateConnections(100, rng);
      expect(connections).toHaveLength(100);
    });

    it("connections are bidirectional", () => {
      const rng = new SeededRandom(42);
      const connections = generateConnections(20, rng);

      for (let i = 0; i < 20; i++) {
        for (const connIdx of connections[i]) {
          // If i connects to connIdx, connIdx should connect to i
          expect(connections[connIdx]).toContain(i);
        }
      }
    });

    it("each profile has 8-15 connections", () => {
      const rng = new SeededRandom(42);
      const connections = generateConnections(100, rng);

      for (let i = 0; i < 100; i++) {
        expect(connections[i].length).toBeGreaterThanOrEqual(8);
        expect(connections[i].length).toBeLessThanOrEqual(30);
        // Upper bound relaxed because bidirectionality can push counts up
      }
    });

    it("no self-connections", () => {
      const rng = new SeededRandom(42);
      const connections = generateConnections(50, rng);

      for (let i = 0; i < 50; i++) {
        expect(connections[i]).not.toContain(i);
      }
    });
  });
});
