import { describe, expect, test } from "bun:test";
import type { DataAdapter } from "obsidian";
import { PersonalDictionary } from "../src/dictionary/personal-dictionary";

class MemoryFiles {
  content = "";
  async exists(): Promise<boolean> { return this.content !== ""; }
  async read(): Promise<string> { return this.content; }
  async write(_path: string, content: string): Promise<void> { this.content = content; }
}

describe("personal dictionary", () => {
  test("previews, normalizes, sorts, and removes a batch", async () => {
    const files = new MemoryFiles();
    const dictionary = new PersonalDictionary(files as unknown as DataAdapter, "personal.txt");
    await dictionary.load();
    const preview = dictionary.preview("Zulu, apple apple bad_word café’s");
    expect(preview.valid).toEqual(["Zulu", "apple", "café"]);
    expect(preview.duplicates).toEqual(["apple"]);
    expect(preview.invalid).toEqual(["bad_word"]);
    await dictionary.add(preview.valid);
    expect(files.content).toBe("apple\ncafé\nZulu\n");
    await dictionary.remove(["café"]);
    expect(dictionary.values()).toEqual(["apple", "Zulu"]);
  });
});
