const WORD_PATTERN = /[\p{L}][\p{L}\p{M}]*(?:['’][\p{L}][\p{L}\p{M}]*)*/gu;
const WHOLE_WORD_PATTERN = /^[\p{L}][\p{L}\p{M}]*(?:['’][\p{L}][\p{L}\p{M}]*)*$/u;
const POSSESSIVE_PATTERN = /(['’])s$/iu;

export interface NormalizedWord {
  lookup: string;
  possessive: string;
}

export function normalizeWord(word: string): string {
  return word.normalize("NFC").replaceAll("’", "'");
}

export function splitPossessive(word: string): NormalizedWord {
  const nfc = word.normalize("NFC");
  const match = POSSESSIVE_PATTERN.exec(nfc);
  if (!match || nfc.length <= match[0].length) return { lookup: normalizeWord(nfc), possessive: "" };
  return { lookup: normalizeWord(nfc.slice(0, -match[0].length)), possessive: match[0] };
}

export function isValidPersonalWord(input: string): boolean {
  const { lookup } = splitPossessive(input.trim());
  return lookup.length > 1 && WHOLE_WORD_PATTERN.test(lookup);
}

export function canonicalWord(word: string): string {
  return normalizeWord(word).toLowerCase();
}

export function compareWords(left: string, right: string): number {
  const leftFolded = canonicalWord(left);
  const rightFolded = canonicalWord(right);
  if (leftFolded < rightFolded) return -1;
  if (leftFolded > rightFolded) return 1;
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

export function wordsIn(text: string, offset = 0): Array<{ from: number; to: number; text: string }> {
  const words: Array<{ from: number; to: number; text: string }> = [];
  WORD_PATTERN.lastIndex = 0;
  for (const match of text.matchAll(WORD_PATTERN)) {
    if (match.index === undefined || match[0].length <= 1) continue;
    words.push({ from: offset + match.index, to: offset + match.index + match[0].length, text: match[0] });
  }
  return words;
}

export function applyInputCase(input: string, suggestion: string): string {
  if (input === input.toLocaleUpperCase()) return suggestion.toLocaleUpperCase();
  const first = Array.from(input)[0];
  if (first && first === first.toLocaleUpperCase()) {
    const chars = Array.from(suggestion);
    return `${chars[0]?.toLocaleUpperCase() ?? ""}${chars.slice(1).join("")}`;
  }
  return suggestion;
}
