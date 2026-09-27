import { SuggestModal, type App, type Editor, type EditorPosition } from "obsidian";
import type { Spellchecker } from "../spelling/spellchecker";
import type { WordRange } from "../types";

type Choice = { kind: "suggestion"; text: string } | { kind: "add"; text: string } | { kind: "empty"; text: string };

export interface CorrectionTarget {
  range: WordRange;
  from: EditorPosition;
  to: EditorPosition;
}

export class SpellingSuggestionsModal extends SuggestModal<Choice> {
  private readonly choices: Choice[];

  constructor(
    app: App,
    private readonly editor: Editor,
    private readonly target: CorrectionTarget,
    private readonly spellchecker: Spellchecker,
    private readonly notify: (message: string) => void,
  ) {
    super(app);
    const suggestions = spellchecker.suggest(target.range.text, 5);
    this.choices = suggestions.map((text) => ({ kind: "suggestion", text }));
    if (suggestions.length === 0) this.choices.push({ kind: "empty", text: "No suggestions found" });
    this.choices.push({ kind: "add", text: `Add "${target.range.text}" to personal dictionary` });
    this.setPlaceholder(`Suggestions for "${target.range.text}"`);
  }

  getSuggestions(query: string): Choice[] {
    const normalized = query.toLocaleLowerCase();
    return this.choices.filter(({ text }) => text.toLocaleLowerCase().includes(normalized));
  }

  renderSuggestion(choice: Choice, element: HTMLElement): void {
    element.setText(choice.kind === "suggestion" ? `Suggestion: ${choice.text}` : choice.text);
    if (choice.kind === "empty") element.addClass("is-disabled");
  }

  onChooseSuggestion(choice: Choice): void {
    if (choice.kind === "empty") return;
    if (choice.kind === "add") {
      void this.addPersonalWord();
      return;
    }
    if (this.editor.getRange(this.target.from, this.target.to) !== this.target.range.text) {
      this.notify("The text changed before the correction was applied.");
      return;
    }
    this.editor.replaceRange(choice.text, this.target.from, this.target.to);
    this.editor.setCursor(this.editor.offsetToPos(this.editor.posToOffset(this.target.from) + choice.text.length));
  }

  private async addPersonalWord(): Promise<void> {
    const result = await this.spellchecker.addPersonalWord(this.target.range.text);
    this.notify(result === "added" ? `Added "${this.target.range.text}" to the personal dictionary.`
      : result === "duplicate" ? `"${this.target.range.text}" is already accepted.` : "That word is not valid.");
  }

  override onClose(): void {
    this.editor.focus();
    super.onClose();
  }
}
