import { StateEffect, type Extension } from "@codemirror/state";
import { Decoration, ViewPlugin, type DecorationSet, type EditorView, type ViewUpdate } from "@codemirror/view";
import type { EasySpellcheckSettings } from "../types";
import type { SpellcheckerSnapshot } from "../spelling/spellchecker";
import { DocumentSpelling } from "./document-spelling";

const refreshSpellcheck = StateEffect.define<void>();
const mark = Decoration.mark({ class: "easy-spellcheck-misspelling" });

export interface DecorationController {
  extension: Extension;
  refresh(): void;
  activeView(container?: HTMLElement): EditorView | undefined;
}

export function createDecorationController(
  spellchecker: SpellcheckerSnapshot,
  settings: () => EasySpellcheckSettings,
): DecorationController {
  const views = new Set<EditorView>();

  class SpellingView {
    decorations: DecorationSet = Decoration.none;
    private timer: number | undefined;

    constructor(private readonly view: EditorView) {
      views.add(view);
      this.decorations = this.build(false);
    }

    update(update: ViewUpdate): void {
      if (update.docChanged) {
        this.decorations = this.decorations.map(update.changes);
        this.recheckAfterTyping();
      } else if (update.selectionSet) {
        this.decorations = this.build(false);
      } else if (update.viewportChanged || update.transactions.some((transaction) => transaction.effects.some((effect) => effect.is(refreshSpellcheck)))) {
        this.cancelTimer();
        this.decorations = this.build(false);
      }
    }

    destroy(): void {
      this.cancelTimer();
      views.delete(this.view);
    }

    private recheckAfterTyping(): void {
      this.cancelTimer();
      this.decorations = this.build(true);
      const delay = settings().typingDelay;
      if (delay > 0) this.timer = window.setTimeout(() => {
        this.timer = undefined;
        this.view.dispatch({ effects: refreshSpellcheck.of() });
      }, delay);
    }

    private build(skipActive: boolean): DecorationSet {
      if (!settings().enabled || spellchecker.dictionaryCount === 0) return Decoration.none;
      const spelling = new DocumentSpelling(spellchecker);
      const active = skipActive && this.view.state.selection.main.empty
        ? spelling.wordAt(this.view.state.doc, this.view.state.selection.main.head)
        : undefined;
      const ranges = spelling.words(this.view.state, this.view.visibleRanges)
        .filter((word) => !spellchecker.check(word.text) && !(active && word.from === active.from && word.to === active.to))
        .map(({ from, to }) => mark.range(from, to));
      return Decoration.set(ranges, true);
    }

    private cancelTimer(): void {
      if (this.timer !== undefined) window.clearTimeout(this.timer);
      this.timer = undefined;
    }
  }

  return {
    extension: ViewPlugin.fromClass(SpellingView, { decorations: (plugin) => plugin.decorations }),
    refresh: () => {
      for (const view of views) view.dispatch({ effects: refreshSpellcheck.of() });
    },
    activeView: (container) => [...views].find((view) => view.hasFocus && (!container || container.contains(view.dom)))
      ?? [...views].find((view) => !container || container.contains(view.dom)),
  };
}
