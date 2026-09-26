import { Platform } from "obsidian";
import { parseObsidianPersonalDictionary } from "./obsidian-personal-parser";

/* eslint-disable obsidianmd/hardcoded-config-path -- These are host application data paths, not the vault configuration directory. */

const FILENAME = "Custom Dictionary.txt";

interface NodePath { join(...parts: string[]): string }
interface NodeOs { homedir(): string }
interface NodeFs { readFile(path: string, encoding: "utf8"): Promise<string> }
interface ElectronModule { remote?: { app?: { getPath(name: "userData"): string } } }
interface DesktopWindow extends Window {
  require?: (name: string) => unknown;
  process?: { env?: Record<string, string | undefined> };
}

export async function readObsidianPersonalDictionary(): Promise<{ path: string; words: string[] }> {
  if (!Platform.isDesktop) throw new Error("Obsidian dictionary import is available on desktop only");
  const desktop = window as DesktopWindow;
  if (!desktop.require) throw new Error("Desktop file access is unavailable");
  const path = desktop.require("path") as NodePath;
  const os = desktop.require("os") as NodeOs;
  const fs = desktop.require("fs/promises") as NodeFs;
  const electron = desktop.require("electron") as ElectronModule;
  const home = os.homedir();
  const candidates = new Set<string>();
  const userData = electron.remote?.app?.getPath("userData");
  if (userData) candidates.add(path.join(userData, FILENAME));
  if (Platform.isWin) {
    const appData = desktop.process?.env?.APPDATA;
    if (appData) candidates.add(path.join(appData, "obsidian", FILENAME));
  } else if (Platform.isMacOS) {
    candidates.add(path.join(home, "Library", "Application Support", "obsidian", FILENAME));
  } else {
    const configHome = desktop.process?.env?.XDG_CONFIG_HOME ?? path.join(home, ".config");
    candidates.add(path.join(configHome, "obsidian", FILENAME));
    candidates.add(path.join(home, ".var", "app", "md.obsidian.Obsidian", "config", "obsidian", FILENAME));
    candidates.add(path.join(home, "snap", "obsidian", "current", ".config", "obsidian", FILENAME));
  }
  for (const candidate of candidates) {
    try {
      const words = parseObsidianPersonalDictionary(await fs.readFile(candidate, "utf8"));
      return { path: candidate, words };
    } catch (error) {
      if (!isMissingFile(error)) throw error;
    }
  }
  throw new Error(`Could not find ${FILENAME}. Add a word with Obsidian's built-in spellchecker first`);
}

function isMissingFile(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}
