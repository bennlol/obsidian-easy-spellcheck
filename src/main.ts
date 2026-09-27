import { Notice, Plugin, type Editor, type Menu } from "obsidian";
import { navigateMisspelling } from "./commands/navigation";
import { addContextMenu, correctWithTopSuggestion, openSuggestions } from "./commands/suggestions";
import { DictionaryManager } from "./dictionary/dictionary-manager";
import { createDecorationController, type DecorationController } from "./editor/decorations";
import { Spellchecker } from "./spelling/spellchecker";
import { DEFAULT_SETTINGS, type EasySpellcheckSettings } from "./types";
import { EasySpellcheckSettingsTab } from "./ui/settings-tab";

export default class EasySpellcheckPlugin extends Plugin {
  settings: EasySpellcheckSettings = { ...DEFAULT_SETTINGS };
  readonly spellchecker = new Spellchecker();
  dictionaryManager!: DictionaryManager;
  decorations!: DecorationController;

  override async onload(): Promise<void> {
    await this.loadSettings();
    this.spellchecker.fallbackThreshold = this.settings.fallbackThreshold;
    this.dictionaryManager = new DictionaryManager(this.app, this.manifest.id, this.spellchecker);
    this.decorations = createDecorationController(this.spellchecker, () => this.settings);
    this.registerEditorExtension(this.decorations.extension);
    this.addSettingTab(new EasySpellcheckSettingsTab(this.app, this));
    this.registerCommands();
    this.registerEvent(this.app.workspace.on("editor-menu", (menu: Menu, editor: Editor) => addContextMenu(this, menu, editor)));
    this.register(this.dictionaryManager.onReload(() => this.decorations.refresh()));

    try {
      const result = await this.dictionaryManager.reload();
      if (result.loaded === 0) {
        new Notice("Easy Spellcheck needs a dictionary. Open its settings to import a matching .aff and .dic pair.", 8000);
      }
      if (result.failed > 0) new Notice(`${result.failed} dictionaries could not be loaded. Open settings for details.`);
    } catch (error) {
      this.reportError("Could not load spellcheck dictionaries", error);
    }
  }

  async saveSettings(): Promise<void> { await this.saveData(this.settings); }

  reportError(context: string, error: unknown): void {
    const detail = error instanceof Error ? error.message : String(error);
    console.error(`[Easy Spellcheck] ${context}`, error);
    new Notice(`${context}: ${detail}`);
  }

  private async loadSettings(): Promise<void> {
    const stored: unknown = await this.loadData();
    const data = stored && typeof stored === "object" ? stored as Partial<EasySpellcheckSettings> : {};
    this.settings = {
      enabled: typeof data.enabled === "boolean" ? data.enabled : DEFAULT_SETTINGS.enabled,
      typingDelay: this.clampNumber(data.typingDelay, 0, 2000, DEFAULT_SETTINGS.typingDelay, 100),
      fallbackThreshold: this.clampNumber(data.fallbackThreshold, 0, 4, DEFAULT_SETTINGS.fallbackThreshold, 1),
      navigationNotices: typeof data.navigationNotices === "boolean" ? data.navigationNotices : DEFAULT_SETTINGS.navigationNotices,
    };
  }

  private registerCommands(): void {
    this.addCommand({ id: "next-misspelling", name: "Go to next misspelling", editorCallback: (editor) => navigateMisspelling(this, editor, 1) });
    this.addCommand({ id: "previous-misspelling", name: "Go to previous misspelling", editorCallback: (editor) => navigateMisspelling(this, editor, -1) });
    this.addCommand({ id: "show-suggestions", name: "Show spelling suggestions", editorCallback: (editor) => openSuggestions(this, editor) });
    this.addCommand({ id: "correct-with-top-suggestion", name: "Correct word with top suggestion", editorCallback: (editor) => correctWithTopSuggestion(this, editor) });
    this.addCommand({ id: "reload-dictionaries", name: "Reload dictionaries", callback: async () => {
      try {
        const result = await this.dictionaryManager.reload();
        new Notice(`Loaded ${result.loaded} dictionaries with about ${result.wordCount.toLocaleString()} words. ${result.failed} failed.`);
      } catch (error) { this.reportError("Could not reload dictionaries", error); }
    } });
    this.addCommand({ id: "reload-personal-dictionary", name: "Reload personal dictionary", callback: async () => {
      try {
        await this.dictionaryManager.reload();
        const count = this.dictionaryManager.personal.values().length;
        new Notice(`Reloaded ${count} personal ${count === 1 ? "word" : "words"}.`);
      } catch (error) { this.reportError("Could not reload the personal dictionary", error); }
    } });
  }

  private clampNumber(value: unknown, minimum: number, maximum: number, fallback: number, step: number): number {
    if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
    return Math.round(Math.max(minimum, Math.min(maximum, value)) / step) * step;
  }
}
