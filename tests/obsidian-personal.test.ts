import { expect, test } from "bun:test";
import { parseObsidianPersonalDictionary } from "../src/dictionary/obsidian-personal-parser";

test("removes Obsidian's checksum line from imported personal words", () => {
  const content = "Obsidian\nnaïve\n\nchecksum_v1 = 0123456789abcdef\n";
  expect(parseObsidianPersonalDictionary(content)).toEqual(["Obsidian", "naïve"]);
});
