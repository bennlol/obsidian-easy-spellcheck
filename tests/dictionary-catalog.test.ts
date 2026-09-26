import { describe, expect, test } from "bun:test";
import { defaultDictionaryId, DICTIONARY_CATALOG } from "../src/dictionary/dictionary-catalog";

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

  test("chooses only explicitly mapped locale dictionaries", () => {
    expect(defaultDictionaryId("en", "en-GB")).toBe("en-GB");
    expect(defaultDictionaryId("de", "de-AT")).toBe("de-AT");
    expect(defaultDictionaryId("pt-BR", "pt-PT")).toBe("pt");
    expect(defaultDictionaryId("pt", "pt-PT")).toBe("pt-PT");
    expect(defaultDictionaryId("es", "es-MX")).toBe("es-MX");
    expect(defaultDictionaryId("en", "en-NZ")).toBe("en");
    expect(defaultDictionaryId("ja", "ja-JP")).toBe("en");
  });

  test("does not let the system locale override a different app language", () => {
    expect(defaultDictionaryId("fr", "en-GB")).toBe("fr");
    expect(defaultDictionaryId("de", "es-MX")).toBe("de");
  });
});
