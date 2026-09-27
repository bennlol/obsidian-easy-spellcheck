import { ensureSyntaxTree, syntaxTree } from "@codemirror/language";
import type { EditorState, Text } from "@codemirror/state";
import type { SyntaxNode, Tree } from "@lezer/common";
import type { Misspelling, WordRange } from "../types";
import type { SpellcheckerSnapshot } from "../spelling/spellchecker";
import { wordsIn } from "../spelling/normalization";

const EXCLUDED_NODE = /(?:Frontmatter|YAML|FencedCode|CodeBlock|InlineCode|CodeText|URL|LinkDestination|HTML|Comment|Embed|Hashtag|PropertyName|(?:^|[-_])Tag(?:$|[-_]))/i;
const URL_PATTERN = /(?:https?|ftp):\/\/[^\s<>()]+|www\.[^\s<>()]+/giu;
const WIKILINK_PATTERN = /(!?)\[\[([^\]\n]+)\]\]/gu;

function isExcluded(node: SyntaxNode): boolean {
  for (let current: SyntaxNode | null = node; current; current = current.parent) {
    if (EXCLUDED_NODE.test(current.name)) return true;
  }
  return false;
}

export class DocumentSpelling {
  constructor(private readonly spellchecker: SpellcheckerSnapshot) {}

  wordAt(document: Text, position: number): WordRange | undefined {
    const clamped = Math.max(0, Math.min(position, document.length));
    const line = document.lineAt(clamped);
    return wordsIn(line.text, line.from).find(({ from, to }) => clamped >= from && clamped <= to);
  }

  selectedWord(document: Text, from: number, to: number): WordRange | undefined {
    if (from === to) return this.wordAt(document, from);
    const complete = this.wordAt(document, from);
    return complete?.from === from && complete.to === to ? complete : undefined;
  }

  words(
    state: EditorState,
    ranges: readonly { from: number; to: number }[] = [{ from: 0, to: state.doc.length }],
    tree: Tree = syntaxTree(state),
  ): WordRange[] {
    const result: WordRange[] = [];
    const expanded = ranges.map(({ from, to }) => ({ from: state.doc.lineAt(from).from, to: state.doc.lineAt(to).to }))
      .sort((left, right) => left.from - right.from);
    const merged: Array<{ from: number; to: number }> = [];
    for (const range of expanded) {
      const previous = merged.at(-1);
      if (previous && range.from <= previous.to) previous.to = Math.max(previous.to, range.to);
      else merged.push({ ...range });
    }
    for (const range of merged) {
      const text = state.doc.sliceString(range.from, range.to);
      const excludedRanges: Array<{ from: number; to: number }> = [];
      URL_PATTERN.lastIndex = 0;
      for (const match of text.matchAll(URL_PATTERN)) {
        if (match.index !== undefined) excludedRanges.push({ from: range.from + match.index, to: range.from + match.index + match[0].length });
      }
      WIKILINK_PATTERN.lastIndex = 0;
      for (const match of text.matchAll(WIKILINK_PATTERN)) {
        if (match.index === undefined) continue;
        const from = range.from + match.index;
        const target = match[2]?.split("|", 1)[0] ?? "";
        excludedRanges.push(match[1]
          ? { from, to: from + match[0].length }
          : { from: from + 2, to: from + 2 + target.length });
      }
      excludedRanges.sort((left, right) => left.from - right.from);
      let excludedIndex = 0;
      for (const word of wordsIn(text, range.from)) {
        while ((excludedRanges[excludedIndex]?.to ?? Number.POSITIVE_INFINITY) <= word.from) excludedIndex += 1;
        const excluded = excludedRanges[excludedIndex];
        const inExcludedRange = excluded !== undefined && word.from >= excluded.from && word.to <= excluded.to;
        if (!inExcludedRange && !isExcluded(tree.resolveInner(word.from, 1))) result.push(word);
      }
    }
    return result;
  }

  findMisspellings(state: EditorState): Misspelling[] {
    const tree = ensureSyntaxTree(state, state.doc.length, 250) ?? syntaxTree(state);
    return this.words(state, [{ from: 0, to: state.doc.length }], tree).filter((word) => !this.spellchecker.check(word.text));
  }
}
