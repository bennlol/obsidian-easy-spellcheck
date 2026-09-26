import { describe, expect, test } from "bun:test";
import { Spellchecker } from "../src/spelling/spellchecker";

const aff = "SET UTF-8\nTRY abcdefghijklmnopqrstuvwxyz\nSFX S Y 1\nSFX S 0 s .\n";
const dic = "4\nhello\nworld\ncolor/S\nspirit\n";

function checker(): Spellchecker {
  const checker = new Spellchecker();
  checker.replace([Spellchecker.createDictionary({ aff, dic })], ["hello", "world", "color", "spirit"], []);
  return checker;
}

describe("spellchecker", () => {
  test("checks dictionary words, affixes, and possessives", () => {
    const spellchecker = checker();
    expect(spellchecker.check("hello")).toBe(true);
    expect(spellchecker.check("colors")).toBe(true);
    expect(spellchecker.check("world’s")).toBe(true);
    expect(spellchecker.check("wurld")).toBe(false);
  });

  test("deduplicates suggestions and restores casing and possessives", () => {
    const spellchecker = checker();
    const suggestions = spellchecker.suggest("WURLD’s");
    expect(suggestions).toContain("WORLD’s");
    expect(new Set(suggestions.map((word) => word.toLocaleLowerCase())).size).toBe(suggestions.length);
  });

  test("falls back deterministically", () => {
    const spellchecker = new Spellchecker();
    spellchecker.fallbackThreshold = 1;
    spellchecker.replace([], ["cot", "cut", "cats", "cat"], []);
    expect(spellchecker.suggest("cet")).toEqual(["cat", "cot", "cut", "cats"]);
  });

  test("adds personal words through persistence callback", async () => {
    const spellchecker = checker();
    spellchecker.onAddPersonalWord = async () => "added";
    expect(await spellchecker.addPersonalWord("Obsidian’s")).toBe("added");
    expect(await spellchecker.addPersonalWord("bad_word")).toBe("invalid");
  });
});
