import { describe, expect, test } from "bun:test";
import { applyInputCase, isValidPersonalWord, normalizeWord, splitPossessive, wordsIn } from "../src/spelling/normalization";

describe("word normalization", () => {
  test("normalizes Unicode and curly apostrophes", () => {
    expect(normalizeWord("l’esprit")).toBe("l'esprit");
    expect(normalizeWord("cafe\u0301")).toBe("café");
  });

  test("strips possessives but leaves internal apostrophes", () => {
    expect(splitPossessive("James’s")).toEqual({ lookup: "James", possessive: "’s" });
    expect(splitPossessive("don't")).toEqual({ lookup: "don't", possessive: "" });
  });

  test("recognizes Unicode words and uses numbers, underscores, and hyphens as boundaries", () => {
    expect(wordsIn("a naïve l’esprit foo-bar abc_δεζ 42cats").map(({ text }) => text))
      .toEqual(["naïve", "l’esprit", "foo", "bar", "abc", "δεζ", "cats"]);
  });

  test("validates personal words", () => {
    expect(isValidPersonalWord("O’Brien's")).toBe(true);
    expect(isValidPersonalWord("x")).toBe(false);
    expect(isValidPersonalWord("word_2")).toBe(false);
    expect(isValidPersonalWord("two-words")).toBe(false);
  });

  test("preserves input case", () => {
    expect(applyInputCase("WORD", "world")).toBe("WORLD");
    expect(applyInputCase("Word", "world")).toBe("World");
    expect(applyInputCase("word", "World")).toBe("World");
  });
});
