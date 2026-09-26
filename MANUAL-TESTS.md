# Manual test checklist

Record the Obsidian version, operating system, plugin commit, and dictionary source with each run.

## Installation and storage

- [ ] A clean desktop install opens without console errors and prompts for a dictionary.
- [ ] Android can import a matching `.aff` and `.dic` pair.
- [ ] iOS can import a matching `.aff` and `.dic` pair.
- [ ] Desktop and mobile can import a ZIP containing a matching pair.
- [ ] Desktop and mobile can download each catalog language after confirmation.
- [ ] Cancelling the download confirmation makes no network request.
- [ ] A failed or oversized download leaves no partial dictionary pair.
- [ ] Imported dictionaries survive an Obsidian restart.
- [ ] An incomplete or corrupt pair produces a useful notice.
- [ ] A corrupt pair does not disable another loaded dictionary.
- [ ] Removing a dictionary asks for confirmation and removes both files.

## Editor behavior

- [ ] Prose misspellings receive a red wavy underline.
- [ ] Frontmatter, fenced code, inline code, URLs, link destinations, HTML, tags, embeds, and properties receive no underline.
- [ ] Decorations update after typing delay, viewport changes, settings changes, and dictionary reloads.
- [ ] The active word is not underlined while typing.
- [ ] Disabling the plugin removes all decorations.
- [ ] A long document remains responsive while scrolling and typing.
- [ ] Popout windows and embedded Markdown editors work.

## Corrections and navigation

- [ ] Context-menu suggestions replace the complete word and restore focus.
- [ ] The suggestions dialog works with touch, mouse, arrow keys, Enter, Escape, and mobile back.
- [ ] A stale suggestions dialog cannot replace changed text.
- [ ] Next and previous navigation select, reveal, and wrap around misspellings.
- [ ] Replacements of different lengths do not break later navigation.
- [ ] The full keyboard-only correction workflow works with no default hotkeys.
- [ ] Commands added to the mobile toolbar work with software and hardware keyboards.

## Personal words

- [ ] Bulk preview reports valid, duplicate, and invalid entries correctly.
- [ ] Text-file import fills the preview without writing immediately.
- [ ] Added words persist across restart and refresh every open editor.
- [ ] Undo removes the full most recent batch and disappears after use or reload.

## Release

- [ ] Test one small dictionary, one large English dictionary, and multiple dictionaries.
- [ ] Measure startup, visible-range checks, full-document navigation, and suggestion latency.
- [ ] `bun run check` passes.
- [ ] The draft release has loose `main.js`, `manifest.json`, and `styles.css` assets.
- [ ] A clean vault loads without console errors or startup network requests.
- [ ] Spellchecking and correction commands never make network requests.
- [ ] Capture current desktop and mobile screenshots for the README.
