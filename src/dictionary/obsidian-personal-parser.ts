export function parseObsidianPersonalDictionary(content: string): string[] {
  return content.split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) => line !== "" && !/^checksum_v\d+\s*=/iu.test(line));
}
