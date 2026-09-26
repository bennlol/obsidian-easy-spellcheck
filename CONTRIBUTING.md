# Contributing

Use Bun 1.4.0, keep `bun.lock` current, and do not add npm or pnpm lockfiles.

Before opening a pull request:

1. Add tests for changed scanner, dictionary, or correction behavior.
2. Run `bun run check`.
3. Run the relevant items in [MANUAL-TESTS.md](MANUAL-TESTS.md) when the change touches Obsidian UI behavior.
4. Describe any dictionary used for testing without committing it to the repository.

Keep Obsidian integration thin. Shared word handling belongs in `src/spelling/normalization.ts`, Markdown decisions belong in `DocumentSpelling`, and dictionary persistence belongs in `DictionaryManager`. Do not access private editor properties such as `.cm` or store the plugin on `window`.

The project accepts no bundled language dictionaries. Contributions must not add telemetry or account code. Dictionary downloads must require a user action, show the source before connecting, use a pinned source revision, and never transmit vault content.
