import { describe, expect, test } from "bun:test";
import { strToU8, zipSync } from "fflate";
import { decodeDictionaryPair, dictionaryVocabulary, expandImportFiles, sanitizeDictionaryId } from "../src/dictionary/dictionary-import";

describe("dictionary imports", () => {
  test("extracts dictionary files from ZIP archives", async () => {
    const zip = zipSync({ "nested/en.aff": strToU8("SET UTF-8"), "nested/en.dic": strToU8("1\nhello"), "readme.md": strToU8("ignore") });
    const files = await expandImportFiles([new File([zip], "dictionary.zip")]);
    expect(files.map(({ name }) => name).sort()).toEqual(["en.aff", "en.dic"]);
  });

  test("reads root words without flags or morphology", () => {
    expect(dictionaryVocabulary("3\nhello/S\nworld po:noun\ncafé\n")).toEqual(["hello", "world", "café"]);
  });

  test("decodes dictionaries using their declared encoding", () => {
    const aff = new TextEncoder().encode("SET ISO8859-1\n");
    const dic = Uint8Array.from([49, 10, 99, 97, 102, 233, 10]);
    expect(decodeDictionaryPair(aff, dic).dic).toBe("1\ncafé\n");
  });

  test("preserves case in stable dictionary identifiers", () => {
    expect(sanitizeDictionaryId("en_US-large")).toBe("en_US-large");
    expect(sanitizeDictionaryId("French (France)")).toBe("French-France");
    expect(() => sanitizeDictionaryId("..")).toThrow();
  });
});
