import nspell, { type NSpell } from "nspell";
import type { AddWordResult } from "../types";
import { editDistanceAtMostTwo } from "./edit-distance";
import { applyInputCase, canonicalWord, compareWords, isValidPersonalWord, normalizeWord, splitPossessive } from "./normalization";

export interface DictionarySource {
  aff: string;
  dic: string;
}

export interface SpellcheckerSnapshot {
  check(word: string): boolean;
  suggest(word: string, limit?: number): string[];
  readonly dictionaryCount: number;
  readonly wordCount: number;
}

export class Spellchecker implements SpellcheckerSnapshot {
  private readonly personal = new Map<string, string>();
  private dictionaries: NSpell[] = [];
  private vocabularyByLength = new Map<number, Map<string, string>>();
  fallbackThreshold = 1;
  onAddPersonalWord: ((word: string) => Promise<AddWordResult>) | undefined;

  get dictionaryCount(): number { return this.dictionaries.length; }
  get wordCount(): number {
    let count = 0;
    for (const values of this.vocabularyByLength.values()) count += values.size;
    return count;
  }

  static createDictionary(source: DictionarySource): NSpell {
    return nspell(source.aff, source.dic);
  }

  replace(dictionaries: NSpell[], vocabulary: Iterable<string>, personalWords: Iterable<string>): void {
    const personal = new Map<string, string>();
    for (const word of personalWords) personal.set(canonicalWord(word), normalizeWord(word));
    const byLength = new Map<number, Map<string, string>>();
    for (const raw of [...vocabulary, ...personal.values()]) {
      const word = normalizeWord(raw);
      const length = Array.from(word).length;
      const bucket = byLength.get(length) ?? new Map<string, string>();
      if (!bucket.has(canonicalWord(word))) bucket.set(canonicalWord(word), word);
      byLength.set(length, bucket);
    }
    for (const dictionary of dictionaries) {
      for (const word of personal.values()) dictionary.add(word);
    }
    this.dictionaries = dictionaries;
    this.vocabularyByLength = byLength;
    this.personal.clear();
    for (const [key, value] of personal) this.personal.set(key, value);
  }

  check(raw: string): boolean {
    const { lookup } = splitPossessive(raw);
    if (Array.from(lookup).length <= 1) return true;
    const key = canonicalWord(lookup);
    if (this.personal.has(key)) return true;
    return this.dictionaries.some((dictionary) => dictionary.correct(lookup));
  }

  suggest(raw: string, limit = 5): string[] {
    const cappedLimit = Math.max(0, Math.min(5, limit));
    if (cappedLimit === 0) return [];
    const { lookup, possessive } = splitPossessive(raw);
    const unique = new Map<string, { word: string; distance: number; rank: number }>();
    for (const dictionary of this.dictionaries) {
      for (const [rank, candidate] of dictionary.suggest(lookup).entries()) {
        const displayed = applyInputCase(lookup, normalizeWord(candidate));
        const key = canonicalWord(displayed);
        const previous = unique.get(key);
        if (!previous || rank < previous.rank) {
          unique.set(key, { word: displayed, distance: suggestionDistance(lookup, displayed), rank });
        }
      }
    }
    if (this.fallbackThreshold > 0 && unique.size < this.fallbackThreshold) {
      for (const candidate of this.fallback(lookup)) {
        const key = canonicalWord(candidate);
        if (!unique.has(key)) unique.set(key, { word: candidate, distance: suggestionDistance(lookup, candidate), rank: Number.POSITIVE_INFINITY });
      }
    }
    return [...unique.values()]
      .sort((left, right) => left.distance - right.distance || left.rank - right.rank)
      .slice(0, cappedLimit)
      .map(({ word }) => `${word}${possessive}`);
  }

  async addPersonalWord(raw: string): Promise<AddWordResult> {
    const word = splitPossessive(raw.trim()).lookup;
    if (!isValidPersonalWord(word)) return "invalid";
    if (this.check(word)) return "duplicate";
    if (!this.onAddPersonalWord) return "invalid";
    return this.onAddPersonalWord(word);
  }

  private fallback(raw: string): string[] {
    const lower = canonicalWord(raw);
    const length = Array.from(lower).length;
    const ranked: Array<{ word: string; distance: number; order: string }> = [];
    for (let size = Math.max(1, length - 1); size <= length + 1; size += 1) {
      for (const [order, word] of this.vocabularyByLength.get(size) ?? []) {
        const distance = editDistanceAtMostTwo(lower, order);
        if (distance === undefined) continue;
        const candidate = { word: applyInputCase(raw, word), distance, order };
        const insertion = ranked.findIndex((item) => distance < item.distance || (distance === item.distance && compareWords(order, item.order) < 0));
        if (insertion === -1) ranked.push(candidate);
        else ranked.splice(insertion, 0, candidate);
        if (ranked.length > 5) ranked.pop();
      }
    }
    return ranked.map(({ word }) => word);
  }
}

function suggestionDistance(input: string, candidate: string): number {
  const distance = editDistanceAtMostTwo(canonicalWord(input), canonicalWord(candidate));
  if (distance === undefined) return Number.POSITIVE_INFINITY;
  return distance + (input === input.toLocaleLowerCase() && candidate !== candidate.toLocaleLowerCase() ? 0.5 : 0);
}
