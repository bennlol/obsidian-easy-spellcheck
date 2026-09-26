import { Notice, type Editor } from "obsidian";
import { EditorSelection } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { DocumentSpelling } from "../editor/document-spelling";
import type EasySpellcheckPlugin from "../main";

export function navigateMisspelling(plugin: EasySpellcheckPlugin, editor: Editor, direction: 1 | -1): void {
  if (!plugin.settings.enabled) { optionalNotice(plugin, "Spellchecking is disabled."); return; }
  if (plugin.spellchecker.dictionaryCount === 0) { optionalNotice(plugin, "No dictionaries are loaded."); return; }
  const view = plugin.decorations.activeView();
  if (!view) { optionalNotice(plugin, "No active Markdown editor."); return; }
  const misspellings = new DocumentSpelling(plugin.spellchecker).findMisspellings(view.state);
  if (misspellings.length === 0) { optionalNotice(plugin, "No misspellings found."); return; }
  const cursor = editor.posToOffset(editor.getCursor(direction > 0 ? "to" : "from"));
  let target = direction > 0
    ? misspellings.find(({ from }) => from >= cursor)
    : [...misspellings].reverse().find(({ to }) => to <= cursor);
  const wrapped = !target;
  target ??= direction > 0 ? misspellings[0] : misspellings.at(-1);
  if (!target) return;
  view.dispatch({
    selection: EditorSelection.single(target.from, target.to),
    effects: EditorView.scrollIntoView(target.from, { y: "center" }),
  });
  view.focus();
  if (wrapped) optionalNotice(plugin, direction > 0 ? "Wrapped to the first misspelling." : "Wrapped to the last misspelling.");
}

function optionalNotice(plugin: EasySpellcheckPlugin, message: string): void {
  if (plugin.settings.navigationNotices) new Notice(message);
}
