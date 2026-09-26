import { normalizePath, requestUrl, type App } from "obsidian";
import type { NSpell } from "nspell";
import type { DictionaryStatus, ImportResult, LoadResult } from "../types";
import { Spellchecker } from "../spelling/spellchecker";
import type { DownloadableDictionary } from "./dictionary-catalog";
import { decodeDictionaryPair, dictionaryVocabulary, expandImportFiles, sanitizeDictionaryId, type ImportFile } from "./dictionary-import";
import { PersonalDictionary } from "./personal-dictionary";

interface Pair { id: string; aff: string; dic: string; folder?: string }

export class DictionaryManager {
  readonly directory: string;
  readonly personal: PersonalDictionary;
  private statuses: DictionaryStatus[] = [];
  private pairs = new Map<string, Pair>();
  private reloadListeners = new Set<() => void>();

  constructor(private readonly app: App, pluginId: string, private readonly spellchecker: Spellchecker) {
    this.directory = normalizePath(`${app.vault.configDir}/plugins/${pluginId}/dicts`);
    this.personal = new PersonalDictionary(app.vault.adapter, normalizePath(`${this.directory}/personal.txt`));
    spellchecker.onAddPersonalWord = async (word) => {
      const result = this.personal.preview(word);
      if (result.valid.length === 0) return result.invalid.length > 0 ? "invalid" : "duplicate";
      await this.personal.add(result.valid);
      await this.reload();
      return "added";
    };
  }

  list(): DictionaryStatus[] { return this.statuses.map((status) => ({ ...status })); }
  onReload(listener: () => void): () => void {
    this.reloadListeners.add(listener);
    return () => this.reloadListeners.delete(listener);
  }

  async ensureDirectory(): Promise<void> {
    if (!(await this.app.vault.adapter.exists(this.directory))) await this.app.vault.adapter.mkdir(this.directory);
  }

  async import(files: File[]): Promise<ImportResult> {
    await this.ensureDirectory();
    const expanded = await expandImportFiles(files);
    const grouped = new Map<string, Partial<Record<"aff" | "dic", ImportFile>>>();
    for (const file of expanded) {
      const match = /^(.*)\.(aff|dic)$/iu.exec(file.name);
      if (!match?.[1] || !match[2]) continue;
      const id = sanitizeDictionaryId(match[1]);
      const pair = grouped.get(id) ?? {};
      pair[match[2].toLocaleLowerCase() as "aff" | "dic"] = file;
      grouped.set(id, pair);
    }
    const result: ImportResult = { imported: [], unmatched: [], invalid: [] };
    for (const [id, pair] of grouped) {
      if (!pair.aff || !pair.dic) {
        result.unmatched.push(pair.aff?.name ?? pair.dic?.name ?? id);
        continue;
      }
      const { aff, dic } = decodeDictionaryPair(pair.aff.data, pair.dic.data);
      try {
        Spellchecker.createDictionary({ aff, dic });
        await this.writeManagedDictionary(id, pair.aff.data, pair.dic.data, {
          kind: "import",
          importedAt: new Date().toISOString(),
          originalFiles: [pair.aff.name, pair.dic.name],
        });
        result.imported.push(id);
      } catch (error) {
        result.invalid.push({ name: id, error: this.message(error) });
      }
    }
    if (result.imported.length > 0) await this.reload();
    return result;
  }

  async download(dictionary: DownloadableDictionary): Promise<void> {
    await this.ensureDirectory();
    const [aff, dic, license] = await Promise.all([
      this.downloadFile(dictionary.affUrl),
      this.downloadFile(dictionary.dicUrl),
      dictionary.licenseUrl === undefined
        ? Promise.resolve(new TextEncoder().encode(dictionary.licenseText ?? "See SOURCE.json for license details."))
        : this.downloadFile(dictionary.licenseUrl),
    ]);
    const decoded = decodeDictionaryPair(aff, dic);
    Spellchecker.createDictionary(decoded);
    await this.writeManagedDictionary(dictionary.id, aff, dic, {
      kind: "download",
      name: dictionary.name,
      downloadedAt: new Date().toISOString(),
      source: dictionary.sourceUrl,
      files: { aff: dictionary.affUrl, dic: dictionary.dicUrl, license: dictionary.licenseUrl ?? dictionary.licenseText },
    }, new TextDecoder().decode(license));
    await this.reload();
  }

  async reload(): Promise<LoadResult> {
    await this.ensureDirectory();
    const personal = await this.personal.load();
    const pairs = await this.diskPairs();
    this.pairs = new Map(pairs.map((pair) => [pair.id, pair]));
    const dictionaries: NSpell[] = [];
    const vocabulary: string[] = [];
    const statuses: DictionaryStatus[] = [];
    for (const pair of pairs) {
      try {
        const affData = new Uint8Array(await this.app.vault.adapter.readBinary(pair.aff));
        const dicData = new Uint8Array(await this.app.vault.adapter.readBinary(pair.dic));
        const { aff, dic } = decodeDictionaryPair(affData, dicData);
        const words = dictionaryVocabulary(dic);
        dictionaries.push(Spellchecker.createDictionary({ aff, dic }));
        vocabulary.push(...words);
        statuses.push({ id: pair.id, name: pair.id, status: "loaded", wordCount: words.length });
      } catch (error) {
        statuses.push({ id: pair.id, name: pair.id, status: "error", wordCount: 0, error: this.message(error) });
      }
    }
    if (dictionaries.length > 0 || pairs.length === 0) this.spellchecker.replace(dictionaries, vocabulary, personal);
    this.statuses = statuses;
    for (const listener of this.reloadListeners) listener();
    return {
      loaded: statuses.filter(({ status }) => status === "loaded").length,
      failed: statuses.filter(({ status }) => status === "error").length,
      wordCount: vocabulary.length,
    };
  }

  async remove(id: string): Promise<void> {
    if (!this.statuses.some((status) => status.id === id)) throw new Error(`Dictionary "${id}" is not loaded`);
    if (id === "." || id === ".." || /[/\\]/u.test(id)) throw new Error("Dictionary identifier is unsafe");
    const pair = this.pairs.get(id);
    if (!pair) throw new Error(`Dictionary "${id}" could not be found on disk`);
    if (pair.folder) {
      await this.app.vault.adapter.rmdir(pair.folder, true);
    } else {
      for (const path of [pair.aff, pair.dic]) {
        if (await this.app.vault.adapter.exists(path)) await this.app.vault.adapter.remove(path);
      }
    }
    await this.reload();
  }

  private async diskPairs(): Promise<Pair[]> {
    const listing = await this.app.vault.adapter.list(this.directory);
    const found = new Map<string, Pair>();
    const files = new Map<string, Partial<Record<"aff" | "dic", string>>>();
    for (const path of listing.files) {
      const match = /\/([^/]+)\.(aff|dic)$/iu.exec(path);
      if (!match?.[1] || !match[2]) continue;
      const id = match[1];
      const entry = files.get(id) ?? {};
      entry[match[2].toLocaleLowerCase() as "aff" | "dic"] = path;
      files.set(id, entry);
    }
    for (const [id, pair] of files) {
      if (pair.aff && pair.dic) found.set(id, { id, aff: pair.aff, dic: pair.dic });
    }
    for (const folder of listing.folders) {
      const id = folder.split("/").at(-1) ?? "";
      if (!id || id.startsWith(".")) continue;
      const contents = await this.app.vault.adapter.list(folder);
      const aff = contents.files.find((path) => path.toLocaleLowerCase().endsWith(".aff"));
      const dic = contents.files.find((path) => path.toLocaleLowerCase().endsWith(".dic"));
      if (aff && dic) found.set(id, { id, aff, dic, folder });
    }
    return [...found.values()];
  }

  private async writeManagedDictionary(
    id: string,
    aff: Uint8Array,
    dic: Uint8Array,
    source: Record<string, unknown>,
    license?: string,
  ): Promise<void> {
    const folder = normalizePath(`${this.directory}/${id}`);
    const staging = normalizePath(`${this.directory}/.${id}-installing`);
    const backup = normalizePath(`${this.directory}/.${id}-backup`);
    await this.removeFolderIfPresent(staging);
    await this.app.vault.adapter.mkdir(staging);
    let movedExisting = false;
    try {
      await this.app.vault.adapter.writeBinary(normalizePath(`${staging}/${id}.aff`), aff.slice().buffer);
      await this.app.vault.adapter.writeBinary(normalizePath(`${staging}/${id}.dic`), dic.slice().buffer);
      await this.app.vault.adapter.write(normalizePath(`${staging}/SOURCE.json`), `${JSON.stringify(source, null, 2)}\n`);
      if (license !== undefined) await this.app.vault.adapter.write(normalizePath(`${staging}/LICENSE.txt`), license);
      if (await this.app.vault.adapter.exists(folder)) {
        await this.removeFolderIfPresent(backup);
        await this.app.vault.adapter.rename(folder, backup);
        movedExisting = true;
      }
      await this.app.vault.adapter.rename(staging, folder);
      if (movedExisting) await this.removeFolderIfPresent(backup);
    } catch (error) {
      await this.removeFolderIfPresent(staging);
      if (movedExisting && await this.app.vault.adapter.exists(backup)) {
        await this.removeFolderIfPresent(folder);
        await this.app.vault.adapter.rename(backup, folder);
      }
      throw error;
    }
    for (const extension of ["aff", "dic"] as const) {
      const legacy = normalizePath(`${this.directory}/${id}.${extension}`);
      try {
        if (await this.app.vault.adapter.exists(legacy)) await this.app.vault.adapter.remove(legacy);
      } catch (error) {
        console.warn(`[Easy Spellcheck] Could not remove legacy dictionary file ${legacy}`, error);
      }
    }
  }

  private async removeFolderIfPresent(path: string): Promise<void> {
    if (await this.app.vault.adapter.exists(path)) await this.app.vault.adapter.rmdir(path, true);
  }

  private async downloadFile(url: string): Promise<Uint8Array> {
    const response = await requestUrl({ url, throw: false });
    if (response.status < 200 || response.status >= 300) throw new Error(`Download failed with HTTP ${response.status}`);
    const declaredSize = Number(response.headers["content-length"] ?? response.headers["Content-Length"] ?? 0);
    if (declaredSize > 25_000_000) throw new Error("Dictionary file is larger than the 25 MB limit");
    const data = new Uint8Array(response.arrayBuffer);
    if (data.length === 0) throw new Error("Downloaded dictionary file was empty");
    if (data.length > 25_000_000) throw new Error("Dictionary file is larger than the 25 MB limit");
    return data;
  }

  private message(error: unknown): string { return error instanceof Error ? error.message : String(error); }
}
