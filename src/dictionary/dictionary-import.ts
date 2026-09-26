import { unzipSync } from "fflate";
import { normalizeWord } from "../spelling/normalization";

export interface ImportFile {
  name: string;
  data: Uint8Array;
}

const UTF8 = "utf-8";

export async function expandImportFiles(files: File[]): Promise<ImportFile[]> {
  const expanded: ImportFile[] = [];
  for (const file of files) {
    const data = new Uint8Array(await file.arrayBuffer());
    if (file.name.toLocaleLowerCase().endsWith(".zip")) {
      const archive = unzipSync(data);
      for (const [path, contents] of Object.entries(archive)) {
        const name = path.split("/").pop() ?? "";
        if (/\.(?:aff|dic)$/iu.test(name)) expanded.push({ name, data: contents });
      }
    } else if (/\.(?:aff|dic)$/iu.test(file.name)) {
      expanded.push({ name: file.name, data });
    }
  }
  return expanded;
}

export function decodeDictionary(data: Uint8Array, encoding = UTF8): string {
  try {
    return new TextDecoder(encoding).decode(data);
  } catch {
    throw new Error(`Unsupported dictionary encoding: ${encoding}`);
  }
}

export function decodeDictionaryPair(affData: Uint8Array, dicData: Uint8Array): { aff: string; dic: string } {
  const header = new TextDecoder("iso-8859-1").decode(affData.slice(0, 4096));
  const declared = /^SET\s+([^\s#]+)/imu.exec(header)?.[1] ?? UTF8;
  const encoding = normalizeEncoding(declared);
  return { aff: decodeDictionary(affData, encoding), dic: decodeDictionary(dicData, encoding) };
}

export function dictionaryVocabulary(dic: string): string[] {
  const lines = dic.replace(/^\uFEFF/u, "").split(/\r?\n/u);
  if (/^\d+$/u.test(lines[0]?.trim() ?? "")) lines.shift();
  return lines.flatMap((line) => {
    const word = line.trim().split(/\s/u, 1)[0]?.split("/", 1)[0] ?? "";
    return word.length > 1 ? [word] : [];
  });
}

export function sanitizeDictionaryId(name: string): string {
  const safe = normalizeWord(name).replace(/[^\p{L}\p{N}._-]+/gu, "-").replace(/^-+|-+$/gu, "");
  if (!safe || safe === "." || safe === "..") throw new Error("Dictionary filename has no usable name");
  return safe;
}

function normalizeEncoding(value: string): string {
  const compact = value.toLocaleUpperCase().replaceAll(/[-_]/gu, "");
  const aliases: Record<string, string> = {
    UTF8: "utf-8",
    ISO88591: "iso-8859-1",
    ISO88592: "iso-8859-2",
    ISO885915: "iso-8859-15",
    KOI8R: "koi8-r",
    CP1250: "windows-1250",
    CP1251: "windows-1251",
    CP1252: "windows-1252",
  };
  return aliases[compact] ?? value;
}
