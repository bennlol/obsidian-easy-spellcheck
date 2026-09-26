import type { DataAdapter } from "obsidian";
import { compareWords, isValidPersonalWord, normalizeWord, splitPossessive } from "../spelling/normalization";

export interface PersonalPreview {
  valid: string[];
  duplicates: string[];
  invalid: string[];
}

export class PersonalDictionary {
  private words: string[] = [];

  constructor(private readonly adapter: DataAdapter, private readonly path: string) {}

  values(): readonly string[] { return this.words; }

  async load(): Promise<readonly string[]> {
    if (!(await this.adapter.exists(this.path))) {
      this.words = [];
      return this.words;
    }
    const seen = new Set<string>();
    this.words = (await this.adapter.read(this.path)).split(/\r?\n/u)
      .map((word) => splitPossessive(normalizeWord(word.trim())).lookup)
      .filter((word) => isValidPersonalWord(word) && !seen.has(word) && seen.add(word));
    return this.words;
  }

  preview(input: string): PersonalPreview {
    const valid: string[] = [];
    const duplicates: string[] = [];
    const invalid: string[] = [];
    const existing = new Set(this.words);
    const batch = new Set<string>();
    for (const raw of input.split(/[\s,]+/u).filter(Boolean)) {
      const word = splitPossessive(raw).lookup;
      if (!isValidPersonalWord(word)) invalid.push(raw);
      else if (existing.has(word) || batch.has(word)) duplicates.push(word);
      else {
        batch.add(word);
        valid.push(word);
      }
    }
    return { valid, duplicates, invalid };
  }

  async add(input: Iterable<string>): Promise<string[]> {
    const current = new Set(this.words);
    const added: string[] = [];
    for (const raw of input) {
      const word = splitPossessive(raw.trim()).lookup;
      if (isValidPersonalWord(word) && !current.has(word)) {
        current.add(word);
        added.push(word);
      }
    }
    if (added.length > 0) await this.save([...current]);
    return added;
  }

  async remove(words: Iterable<string>): Promise<void> {
    const removed = new Set(words);
    await this.save(this.words.filter((word) => !removed.has(word)));
  }

  private async save(words: string[]): Promise<void> {
    words.sort(compareWords);
    await this.adapter.write(this.path, words.length > 0 ? `${words.join("\n")}\n` : "");
    this.words = words;
  }
}
