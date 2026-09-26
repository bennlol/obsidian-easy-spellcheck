import { describe, expect, test } from "bun:test";
import { Text } from "@codemirror/state";
import { DocumentSpelling } from "../src/editor/document-spelling";

const spelling = new DocumentSpelling({ dictionaryCount: 1, wordCount: 0, check: () => false, suggest: () => [] });
const document = Text.of(["alpha café don't", "second"]);

describe("cursor word lookup", () => {
  test("uses the complete word inside it and at its end", () => {
    expect(spelling.wordAt(document, 2)?.text).toBe("alpha");
    expect(spelling.wordAt(document, 5)?.text).toBe("alpha");
  });

  test("accepts only a complete single-word selection", () => {
    expect(spelling.selectedWord(document, 6, 10)?.text).toBe("café");
    expect(spelling.selectedWord(document, 6, 16)).toBeUndefined();
    expect(spelling.selectedWord(document, 7, 10)).toBeUndefined();
  });
});
