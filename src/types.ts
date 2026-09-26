export interface WordRange {
  from: number;
  to: number;
  text: string;
}

export type Misspelling = WordRange;

export interface DictionaryStatus {
  id: string;
  name: string;
  status: "loaded" | "error";
  wordCount: number;
  error?: string;
}

export interface ImportResult {
  imported: string[];
  unmatched: string[];
  invalid: Array<{ name: string; error: string }>;
}

export interface LoadResult {
  loaded: number;
  failed: number;
  wordCount: number;
}

export type AddWordResult = "added" | "duplicate" | "invalid";

export interface EasySpellcheckSettings {
  enabled: boolean;
  typingDelay: number;
  fallbackThreshold: number;
  navigationNotices: boolean;
}

export const DEFAULT_SETTINGS: EasySpellcheckSettings = {
  enabled: true,
  typingDelay: 500,
  fallbackThreshold: 1,
  navigationNotices: true,
};
