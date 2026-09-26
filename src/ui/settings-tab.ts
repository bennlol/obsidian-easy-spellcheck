import {
  ButtonComponent,
  FuzzySuggestModal,
  Modal,
  Notice,
  Platform,
  PluginSettingTab,
  Setting,
  type App,
  type FuzzyMatch,
} from "obsidian";
import { DICTIONARY_CATALOG, type DownloadableDictionary } from "../dictionary/dictionary-catalog";
import type EasySpellcheckPlugin from "../main";

class ConfirmRemovalModal extends Modal {
  constructor(app: App, private readonly name: string, private readonly confirm: () => Promise<void>) { super(app); }
  override onOpen(): void {
    this.titleEl.setText("Remove dictionary?");
    this.contentEl.createEl("p", { text: `Remove "${this.name}" and its dictionary files?` });
    new Setting(this.contentEl)
      .addButton((button) => button.setButtonText("Cancel").onClick(() => this.close()))
      .addButton((button) => button.setButtonText("Remove").setWarning().onClick(async () => {
        this.close();
        await this.confirm();
      }));
  }
  override onClose(): void { this.contentEl.empty(); }
}

class ConfirmDownloadModal extends Modal {
  constructor(app: App, private readonly dictionary: DownloadableDictionary, private readonly confirm: () => Promise<void>) { super(app); }
  override onOpen(): void {
    this.titleEl.setText(`Download ${this.dictionary.name}?`);
    this.contentEl.createEl("p", {
      text: "This sends a request to GitHub and saves the Hunspell files, upstream license information, and source record together in a local dictionary folder.",
    });
    const license = this.contentEl.createEl("p");
    license.appendText("Dictionary licenses vary by language. ");
    license.createEl("a", { text: "Review source and license files", href: this.dictionary.sourceUrl, attr: { target: "_blank", rel: "noopener" } });
    license.appendText(" before downloading.");
    new Setting(this.contentEl)
      .addButton((button) => button.setButtonText("Cancel").onClick(() => this.close()))
      .addButton((button) => button.setButtonText("Download").setCta().onClick(async () => {
        this.close();
        await this.confirm();
      }));
  }
  override onClose(): void { this.contentEl.empty(); }
}

class DictionaryPickerModal extends FuzzySuggestModal<DownloadableDictionary> {
  constructor(app: App, private readonly choose: (dictionary: DownloadableDictionary) => void) {
    super(app);
    this.setPlaceholder("Search languages and regional variants");
  }

  getItems(): DownloadableDictionary[] { return [...DICTIONARY_CATALOG]; }
  getItemText(dictionary: DownloadableDictionary): string { return `${dictionary.name} ${dictionary.id}`; }
  onChooseItem(dictionary: DownloadableDictionary): void { this.choose(dictionary); }

  override renderSuggestion({ item }: FuzzyMatch<DownloadableDictionary>, element: HTMLElement): void {
    element.addClass("easy-spellcheck-language-option");
    element.createDiv({ cls: "easy-spellcheck-language-name", text: item.name });
    element.createDiv({ cls: "easy-spellcheck-language-code", text: item.id });
  }
}

export class EasySpellcheckSettingsTab extends PluginSettingTab {
  private bulkInput = "";
  private undoBatch: string[] = [];
  private downloadId = DICTIONARY_CATALOG[0]?.id ?? "";

  constructor(app: App, private readonly owner: EasySpellcheckPlugin) {
    super(app, owner);
    owner.dictionaryManager.onReload(() => { this.undoBatch = []; });
  }

  override display(): void {
    const { containerEl } = this;
    containerEl.empty();
    if (this.owner.spellchecker.dictionaryCount === 0) {
      containerEl.createEl("p", { text: "Import a matching .aff and .dic pair to start spellchecking. Dictionary files stay on this device." });
    }

    new Setting(containerEl).setName("Spellchecking").setHeading();
    new Setting(containerEl).setName("Enable spell checker").setDesc("Underline misspelled words and enable correction commands.")
      .addToggle((toggle) => toggle.setValue(this.owner.settings.enabled).onChange(async (value) => {
        this.owner.settings.enabled = value;
        await this.owner.saveSettings();
        this.owner.decorations.refresh();
      }));
    new Setting(containerEl).setName("Typing delay").setDesc("Wait this many milliseconds after typing before rechecking. Set to 0 for immediate checks.")
      .addSlider((slider) => slider.setLimits(0, 2000, 100).setValue(this.owner.settings.typingDelay).onChange(async (value) => {
        this.owner.settings.typingDelay = value;
        await this.owner.saveSettings();
      }));
    new Setting(containerEl).setName("Fuzzy fallback threshold").setDesc("Use edit-distance suggestions when Hunspell returns fewer results. Set to 0 to disable.")
      .addSlider((slider) => slider.setLimits(0, 4, 1).setValue(this.owner.settings.fallbackThreshold).onChange(async (value) => {
        this.owner.settings.fallbackThreshold = value;
        this.owner.spellchecker.fallbackThreshold = value;
        await this.owner.saveSettings();
      }));
    new Setting(containerEl).setName("Navigation notices").setDesc("Show notices for wrapping, unavailable editors, and empty results.")
      .addToggle((toggle) => toggle.setValue(this.owner.settings.navigationNotices).onChange(async (value) => {
        this.owner.settings.navigationNotices = value;
        await this.owner.saveSettings();
      }));

    new Setting(containerEl).setName("Dictionaries").setHeading();
    const selectedDictionary = DICTIONARY_CATALOG.find(({ id }) => id === this.downloadId) ?? DICTIONARY_CATALOG[0];
    new Setting(containerEl).setName("Download a dictionary")
      .setDesc(selectedDictionary === undefined
        ? "No downloadable dictionaries are available."
        : `${selectedDictionary.name} · ${selectedDictionary.id}. Search all ${DICTIONARY_CATALOG.length} dictionaries from wooorm's pinned collection.`)
      .addButton((button) => button.setButtonText("Choose language").onClick(() => {
        new DictionaryPickerModal(this.app, (dictionary) => {
          this.downloadId = dictionary.id;
          this.display();
        }).open();
      }))
      .addButton((button) => button.setButtonText("Download").setCta().onClick(() => this.confirmDownload()));
    new Setting(containerEl).setName("Import dictionary files").setDesc("Choose matching .aff and .dic files, or a ZIP archive containing them.")
      .addButton((button) => button.setButtonText("Import files").onClick(() => this.pickDictionaries()));
    new Setting(containerEl).setName("Reload dictionaries").setDesc("Read all imported dictionaries again.")
      .addButton((button) => button.setButtonText("Reload").onClick(async () => {
        button.setDisabled(true);
        try {
          const result = await this.owner.dictionaryManager.reload();
          new Notice(`Loaded ${result.loaded} dictionaries with about ${result.wordCount.toLocaleString()} words. ${result.failed} failed.`);
          this.owner.decorations.refresh();
          this.display();
        } catch (error) { this.owner.reportError("Could not reload dictionaries", error); }
      }));
    if (Platform.isDesktop) {
      const location = document.createDocumentFragment();
      location.appendText("Stored inside the vault at ");
      location.createEl("code", { text: this.owner.dictionaryManager.directory });
      new Setting(containerEl).setName("Dictionary storage").setDesc(location)
        .addButton((button) => button.setButtonText("Copy path").onClick(async () => {
          try {
            await navigator.clipboard.writeText(this.owner.dictionaryManager.directory);
            new Notice("Dictionary path copied.");
          } catch (error) {
            this.owner.reportError("Could not copy the dictionary path", error);
          }
        }));
    }
    for (const dictionary of this.owner.dictionaryManager.list()) {
      const status = dictionary.status === "loaded"
        ? `Loaded, about ${dictionary.wordCount.toLocaleString()} words`
        : `Error: ${dictionary.error ?? "Unknown parsing error"}`;
      const setting = new Setting(containerEl).setName(dictionary.name).setDesc(status);
      setting.descEl.addClass(dictionary.status === "loaded" ? "easy-spellcheck-status-loaded" : "easy-spellcheck-status-error");
      setting.addButton((button) => button.setButtonText("Reload").onClick(async () => {
        await this.owner.dictionaryManager.reload();
        this.display();
      }));
      setting.addButton((button) => button.setButtonText("Remove").setWarning().onClick(() => {
        new ConfirmRemovalModal(this.app, dictionary.name, async () => {
          try {
            await this.owner.dictionaryManager.remove(dictionary.id);
            this.owner.decorations.refresh();
            new Notice(`Removed "${dictionary.name}".`);
            this.display();
          } catch (error) {
            this.owner.reportError(`Could not remove "${dictionary.name}"`, error);
          }
        }).open();
      }));
    }

    new Setting(containerEl).setName("Personal words").setHeading();
    const panel = containerEl.createDiv({ cls: "easy-spellcheck-personal-panel" });
    const header = panel.createDiv({ cls: "easy-spellcheck-personal-header" });
    const savedCount = this.owner.dictionaryManager.personal.values().length;
    const summary = header.createDiv();
    summary.createEl("div", {
      cls: "easy-spellcheck-personal-count",
      text: `${savedCount.toLocaleString()} saved ${savedCount === 1 ? "word" : "words"}`,
    });
    summary.createEl("div", {
      cls: "easy-spellcheck-personal-help",
      text: "Type words below or import an existing list. Nothing is saved until you add the previewed words.",
    });
    const importActions = header.createDiv({ cls: "easy-spellcheck-personal-imports" });
    importActions.createSpan({ cls: "easy-spellcheck-personal-import-label", text: "Import from" });
    new ButtonComponent(importActions).setButtonText("Text file").onClick(() => this.pickPersonalFile());
    const inputId = "easy-spellcheck-personal-input";
    panel.createEl("label", { cls: "easy-spellcheck-personal-label", text: "Words to add", attr: { for: inputId } });
    const input = panel.createEl("textarea", {
      cls: "easy-spellcheck-personal-input",
      attr: { id: inputId, placeholder: "Separate words with spaces, commas, or new lines" },
    });
    input.value = this.bulkInput;
    const footer = panel.createDiv({ cls: "easy-spellcheck-personal-footer" });
    const status = footer.createDiv({ cls: "easy-spellcheck-personal-status" });
    const actions = footer.createDiv({ cls: "easy-spellcheck-personal-actions" });
    const clearButton = new ButtonComponent(actions).setButtonText("Clear").onClick(() => {
      input.value = "";
      updatePreview();
      input.focus();
    });
    const addButton = new ButtonComponent(actions).setCta().onClick(async () => this.addPersonalWords());
    const updatePreview = (): void => {
      this.bulkInput = input.value;
      const preview = this.owner.dictionaryManager.personal.preview(this.bulkInput);
      status.setText(this.previewText(preview.valid.length, preview.duplicates.length, preview.invalid.length));
      clearButton.setDisabled(this.bulkInput.trim() === "");
      addButton.setDisabled(preview.valid.length === 0)
        .setButtonText(preview.valid.length === 1 ? "Add 1 word" : `Add ${preview.valid.length} words`);
    };
    input.addEventListener("input", updatePreview);
    updatePreview();
    if (this.undoBatch.length > 0) {
      new Setting(containerEl).setName("Undo last add").setDesc(`Remove the ${this.undoBatch.length} words most recently added during this session.`)
        .addButton((button) => button.setButtonText("Undo").onClick(async () => {
          const batch = [...this.undoBatch];
          await this.owner.dictionaryManager.personal.remove(batch);
          await this.owner.dictionaryManager.reload();
          this.undoBatch = [];
          this.owner.decorations.refresh();
          new Notice(`Removed ${batch.length} personal ${batch.length === 1 ? "word" : "words"}.`);
          this.display();
        }));
    }
  }

  private async addPersonalWords(): Promise<void> {
    const preview = this.owner.dictionaryManager.personal.preview(this.bulkInput);
    if (preview.valid.length === 0) { new Notice("No new valid personal words to add."); return; }
    try {
      const added = await this.owner.dictionaryManager.personal.add(preview.valid);
      await this.owner.dictionaryManager.reload();
      this.undoBatch = added;
      this.bulkInput = "";
      this.owner.decorations.refresh();
      new Notice(`Added ${added.length} personal ${added.length === 1 ? "word" : "words"}.`);
      this.display();
    } catch (error) {
      this.owner.reportError("Could not add personal words", error);
    }
  }

  private confirmDownload(): void {
    const dictionary = DICTIONARY_CATALOG.find(({ id }) => id === this.downloadId);
    if (!dictionary) { new Notice("Choose a language to download."); return; }
    new ConfirmDownloadModal(this.app, dictionary, async () => {
      const notice = new Notice(`Downloading ${dictionary.name}…`, 0);
      try {
        await this.owner.dictionaryManager.download(dictionary);
        this.owner.decorations.refresh();
        notice.hide();
        new Notice(`${dictionary.name} is loaded.`);
        this.display();
      } catch (error) {
        notice.hide();
        this.owner.reportError(`Could not download ${dictionary.name}`, error);
      }
    }).open();
  }

  private previewText(valid: number, duplicates: number, invalid: number): string {
    if (valid + duplicates + invalid === 0) return "No words entered.";
    const parts = [`${valid} ready to add`];
    if (duplicates > 0) parts.push(`${duplicates} already saved`);
    if (invalid > 0) parts.push(`${invalid} invalid`);
    return parts.join(" · ");
  }

  private pickDictionaries(): void {
    this.pickFiles(".aff,.dic,.zip", true, async (files) => {
      try {
        const result = await this.owner.dictionaryManager.import(files);
        const messages = [result.imported.length > 0 ? `Imported: ${result.imported.join(", ")}.` : "No dictionaries were imported."];
        if (result.unmatched.length > 0) messages.push(`Missing matching files: ${result.unmatched.join(", ")}.`);
        if (result.invalid.length > 0) messages.push(`Invalid: ${result.invalid.map(({ name, error }) => `${name} (${error})`).join(", ")}.`);
        new Notice(messages.join(" "));
        this.owner.decorations.refresh();
        this.display();
      } catch (error) { this.owner.reportError("Dictionary import failed", error); }
    });
  }

  private pickPersonalFile(): void {
    this.pickFiles(".txt,text/plain", false, async ([file]) => {
      if (!file) return;
      this.bulkInput = await file.text();
      this.display();
    });
  }

  private pickFiles(accept: string, multiple: boolean, consume: (files: File[]) => Promise<void>): void {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = accept;
    input.multiple = multiple;
    input.addEventListener("change", () => { void consume(Array.from(input.files ?? [])); }, { once: true });
    input.click();
  }

}
