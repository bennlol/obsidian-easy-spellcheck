import { describe, expect, test } from "bun:test";
import { DICTIONARY_CATALOG } from "../src/dictionary/dictionary-catalog";

describe("downloadable dictionary catalog", () => {
  test("contains every dictionary in the pinned wooorm revision", () => {
    expect(DICTIONARY_CATALOG).toHaveLength(92);
    expect(new Set(DICTIONARY_CATALOG.map(({ id }) => id)).size).toBe(92);
  });

  test("provides dictionary files, source, and license information", () => {
    for (const dictionary of DICTIONARY_CATALOG) {
      expect(dictionary.affUrl.endsWith(`/${dictionary.id}/index.aff`)).toBe(true);
      expect(dictionary.dicUrl.endsWith(`/${dictionary.id}/index.dic`)).toBe(true);
      expect(dictionary.sourceUrl).toContain(`/${dictionary.id}`);
      expect(dictionary.licenseUrl !== undefined || dictionary.licenseText !== undefined).toBe(true);
    }
  });
});
