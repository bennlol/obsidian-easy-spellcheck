import { describe, expect, test } from "bun:test";
import { markdown } from "@codemirror/lang-markdown";
import { EditorState } from "@codemirror/state";
import { DocumentSpelling } from "../src/editor/document-spelling";

const checker = { dictionaryCount: 1, wordCount: 0, check: () => false, suggest: () => [] };

function checkedWords(source: string): string[] {
  const state = EditorState.create({ doc: source, extensions: [markdown()] });
  return new DocumentSpelling(checker).words(state).map(({ text }) => text);
}

describe("Markdown prose ranges", () => {
  test("includes prose, headings, lists, blockquotes, and link labels", () => {
    const words = checkedWords("# Heading\n\n- list item\n\n> quoted text\n\n[visible label](https://example.com)");
    expect(words).toEqual(["Heading", "list", "item", "quoted", "text", "visible", "label"]);
  });

  test("excludes inline code, fenced code, URLs, and HTML", () => {
    const words = checkedWords("before `inline code` after\n\n```js\ninside fence\n```\n\n<div>hidden html</div>\n\nhttps://example.com/path");
    expect(words).toEqual(["before", "after"]);
  });
});
