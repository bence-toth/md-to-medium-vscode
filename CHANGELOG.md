# Changelog

## [1.0.1] — 2026-06-07

### Fixed

- `github-slugger` is now included in the VSIX, fixing a runtime error when copying to clipboard ([#12](https://github.com/bence-toth/md-to-medium-vscode/issues/12)).

## [1.0.0] — 2026-06-07

### Added

- Command **Markdown to Medium: Copy as Medium HTML** — copies the active Markdown document as rich HTML ready to paste into Medium.
- Status bar button (`$(clippy) Medium`) visible only when a Markdown file is active.
- Output channel **Markdown to Medium** for surfacing clipboard and conversion errors.
- Linux clipboard hint when a native clipboard tool is not found.
