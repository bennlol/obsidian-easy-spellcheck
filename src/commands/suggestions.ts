import { Notice, type Editor, type Menu } from "obsidian";
import { Text } from "@codemirror/state";
import { DocumentSpelling } from "../editor/document-spelling";
import { SpellingSuggestionsModal, type CorrectionTarget } from "../ui/suggestions-modal";
import type EasySpellcheckPlugin from "../main";

export function targetForEditor(editor: Editor, spelling: DocumentSpelling): CorrectionTarget | undefined {
  const from = editor.getCursor("from");
  const to = editor.getCursor("to");
  const document = Text.of(editor.getValue().split("\n"));
  const range = spelling.selectedWord(document, editor.posToOffset(from), editor.posToOffset(to));
  return range ? { range, from: editor.offsetToPos(range.from), to: editor.offsetToPos(range.to) } : undefined;
}

export function openSuggestions(plugin: EasySpellcheckPlugin, editor: Editor): void {
  if (!plugin.settings.enabled) { new Notice("Spellchecking is disabled."); return; }
  if (plugin.spellchecker.dictionaryCount === 0) { new Notice("No dictionaries are loaded."); return; }
  const target = targetForEditor(editor, new DocumentSpelling(plugin.spellchecker));
  if (!target) {
    new Notice(editor.somethingSelected() ? "Select one complete word." : "The cursor is not on a word.");
    return;
  }
  if (!isProseTarget(plugin, target.range)) { new Notice("The cursor is not on checked prose."); return; }
  if (plugin.spellchecker.check(target.range.text)) { new Notice(`"${target.range.text}" is spelled correctly.`); return; }
  new SpellingSuggestionsModal(plugin.app, editor, target, plugin.spellchecker, (message) => new Notice(message)).open();
}

export function addContextMenu(plugin: EasySpellcheckPlugin, menu: Menu, editor: Editor): void {
  if (!plugin.settings.enabled || plugin.spellchecker.dictionaryCount === 0) return;
  const target = targetForEditor(editor, new DocumentSpelling(plugin.spellchecker));
  if (!target || !isProseTarget(plugin, target.range) || plugin.spellchecker.check(target.range.text)) return;
  const suggestions = plugin.spellchecker.suggest(target.range.text, 5);
  if (suggestions.length === 0) menu.addItem((item) => item.setTitle("No suggestions found").setDisabled(true));
  for (const suggestion of suggestions) {
    menu.addItem((item) => item.setTitle(suggestion).onClick(() => replace(editor, target, suggestion)));
  }
  menu.addSeparator();
  menu.addItem((item) => item.setTitle(`Add "${target.range.text}" to personal dictionary`).onClick(async () => {
    const result = await plugin.spellchecker.addPersonalWord(target.range.text);
    new Notice(result === "added" ? `Added "${target.range.text}" to the personal dictionary.`
      : result === "duplicate" ? `"${target.range.text}" is already accepted.` : "That word is not valid.");
    editor.focus();
  }));
}

function isProseTarget(plugin: EasySpellcheckPlugin, range: { from: number; to: number }): boolean {
  const view = plugin.decorations.activeView();
  if (!view) return false;
  return new DocumentSpelling(plugin.spellchecker).words(view.state, [range])
    .some((word) => word.from === range.from && word.to === range.to);
}

function replace(editor: Editor, target: CorrectionTarget, suggestion: string): void {
  if (editor.getRange(target.from, target.to) !== target.range.text) { new Notice("The text changed before the correction was applied."); return; }
  editor.replaceRange(suggestion, target.from, target.to);
  editor.setCursor(editor.offsetToPos(editor.posToOffset(target.from) + suggestion.length));
  editor.focus();
}
