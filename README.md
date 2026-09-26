# Easy Spellcheck

Easy Spellcheck is a local spellchecker for Obsidian on desktop, Android, and iOS. It underlines misspellings in Markdown prose, offers corrections, and supports a keyboard-only review loop. The plugin has no accounts or telemetry. Spellchecking never sends note text over the network.

This repository is under active development. Version 0.1.0 is not ready for the Obsidian Community directory until the manual desktop and mobile checks in [MANUAL-TESTS.md](MANUAL-TESTS.md) pass.

## Dictionary setup

The plugin does not bundle dictionaries. You can search and download any of the 92 normalized dictionaries in a pinned revision of wooorm's collection, supply Hunspell `.aff` and `.dic` files with the same basename, or import a ZIP archive containing matching pairs.

1. Open Obsidian settings.
2. Select **Easy Spellcheck**.
3. Under **Dictionaries**, select **Choose language**, search by language or locale, and select **Download**. Review the source and licensing notice before confirming.

To use your own files, select **Import files** and choose a matching pair or ZIP archive instead.

All successfully loaded dictionaries remain active. A word is accepted when any active dictionary recognizes it. Check the dictionary's license before downloading, importing, or redistributing it. New dictionaries use `dicts/<dictionary-id>/`. Downloads store the `.aff`, `.dic`, upstream license information, and `SOURCE.json` record together. Existing flat dictionary pairs remain supported. The plugin never uploads dictionary files. A confirmed download requests the dictionary pair and available license file from `raw.githubusercontent.com`.

## Corrections and navigation

Open the editor context menu on an underlined word to choose one of up to five corrections or add the word to your personal dictionary. On touch devices, run **Show spelling suggestions** from the command palette or mobile toolbar.

For keyboard-only review, assign your own hotkeys in Obsidian's Hotkeys settings:

1. Run **Go to next misspelling**.
2. Run **Show spelling suggestions**.
3. Choose a correction with the arrow keys and Enter.
4. Run **Go to next misspelling** again.

The plugin defines no default hotkeys. The previous and next commands scan the full active document and wrap at either end. Live underlines scan visible editor ranges only.

## Personal words

The personal dictionary is stored as `dicts/personal.txt`, one NFC-normalized word per line. Use the settings preview to paste several words or load a text file. On desktop, **Load Obsidian words** reads the built-in `Custom Dictionary.txt` into the preview without changing the source file. Obsidian does not expose that host-level file to mobile plugins, so mobile users can import a text file instead. The preview separates valid entries, duplicates, and invalid entries before it writes anything. **Undo last add** removes the most recent nonempty batch added during the current plugin session.

## Settings

- **Enable spell checker** controls decorations and correction commands.
- **Typing delay** ranges from 0 to 2,000 milliseconds in 100 millisecond steps.
- **Fuzzy fallback threshold** ranges from 0 to 4. Zero disables fallback matching.
- **Navigation notices** controls empty-state and wrap notices.
- **Dictionaries** downloads, imports, reloads, lists, and removes local Hunspell pairs.
- **Personal words** previews and adds bulk entries.

## What gets checked

The scanner recognizes Unicode letters, combining marks, and internal straight or curly apostrophes. It checks paragraphs, headings, lists, blockquotes, and link labels. It skips frontmatter, code, URLs, link destinations, HTML, tags, embeds, and property syntax by consulting CodeMirror's Markdown syntax tree. Hyphens, numbers, and underscores form word boundaries. One-character words are ignored.

## Troubleshooting

If no underlines appear, confirm that spellchecking is enabled and at least one dictionary says **Loaded** in settings. An `.aff` file and `.dic` file must share the same basename. The settings list shows parsing errors without disabling other valid dictionaries.

If a correction disappears before it is applied, the document changed after the dialog opened. Run the suggestions command again. This check prevents a stale dialog from replacing unrelated text.

## Screenshots

Desktop and mobile screenshots will be captured from the beta build after the manual test matrix passes. The project does not use generated mockups in place of tested Obsidian screens.

## Development

Install [Bun 1.4.0](https://bun.sh/) and run:

```sh
bun ci
bun run check
```

Useful commands:

```sh
bun run dev        # watch the plugin bundle
bun test           # run unit tests
bun run typecheck  # check strict TypeScript
bun run lint       # run ESLint and Obsidian review rules
bun run bundle     # create the ignored main.js release asset
```

`bun run check` is the same validation used in CI. Development dependencies include Obsidian and CodeMirror types, while the release bundle leaves those modules external for Obsidian to provide.

## Releases

Update `package.json`, `manifest.json`, and `versions.json` together. Tag the commit as `v<version>`. The release workflow verifies the versions, runs the full check, and creates a draft GitHub release containing `main.js`, `manifest.json`, and `styles.css`. Inspect the draft and test its loose assets in a clean vault before publishing it.

## Issues and contributions

Bug reports should include the Obsidian version, platform, dictionary language and source, a minimal Markdown sample, and exact reproduction steps. Do not attach dictionary files unless their license permits redistribution. See [CONTRIBUTING.md](CONTRIBUTING.md) before sending a change.

## License

Easy Spellcheck is released under the MIT License. Bundled dependency notices are in [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md).
