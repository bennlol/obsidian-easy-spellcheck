export interface DownloadableDictionary {
  id: string;
  name: string;
  affUrl: string;
  dicUrl: string;
  licenseUrl: string;
  sourceUrl: string;
}

const REVISION = "8cfea406b505e4d7df52d5a19bce525df98c54ab";
const RAW_ROOT = `https://raw.githubusercontent.com/wooorm/dictionaries/${REVISION}/dictionaries`;
const SOURCE_ROOT = `https://github.com/wooorm/dictionaries/tree/${REVISION}/dictionaries`;

function entry(id: string, name: string, sourcePath: string): DownloadableDictionary {
  return {
    id,
    name,
    affUrl: `${RAW_ROOT}/${sourcePath}/index.aff`,
    dicUrl: `${RAW_ROOT}/${sourcePath}/index.dic`,
    licenseUrl: `${RAW_ROOT}/${sourcePath}/license`,
    sourceUrl: `${SOURCE_ROOT}/${sourcePath}`,
  };
}

export const DICTIONARY_CATALOG: readonly DownloadableDictionary[] = [
  entry("en_US", "English (United States)", "en"),
  entry("en_GB", "English (United Kingdom)", "en-GB"),
  entry("de_DE", "German (Germany)", "de"),
  entry("es_ES", "Spanish (Spain)", "es"),
  entry("fr_FR", "French (France)", "fr"),
  entry("it_IT", "Italian (Italy)", "it"),
  entry("nl_NL", "Dutch (Netherlands)", "nl"),
  entry("pl_PL", "Polish (Poland)", "pl"),
  entry("pt_BR", "Portuguese (Brazil)", "pt"),
  entry("ru_RU", "Russian (Russia)", "ru"),
];
