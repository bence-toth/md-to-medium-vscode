# Markdown to Medium

A VS Code extension that copies the active Markdown document to your clipboard as Medium-ready rich HTML — ready to paste straight into the Medium editor with all heading styles, code blocks, and formatting intact.

## Usage

1. Open a Markdown file.
2. Run **Markdown to Medium: Copy as Medium HTML** from the Command Palette, or click the `$(clippy) Medium` button in the status bar.
3. Paste into the Medium editor.

The command operates on the full in-memory document (unsaved edits included).

## Requirements

- VS Code 1.90+
- Node.js ≥ 20 (bundled with VS Code on desktop — no separate install needed)
- **Linux only:** one of `wl-clipboard` (Wayland), `xclip`, or `xsel` must be installed for clipboard access

## How it works

Powered by [`md-to-medium`](https://www.npmjs.com/package/md-to-medium). HTML is written to the clipboard using OS-native tools so that the `text/html` MIME type is preserved — plain-text clipboard writes are rejected by Medium's editor.

## Local install

```sh
code --install-extension markdown-to-medium-vscode-0.1.0.vsix
```

The extension is unsigned and unpublished. VS Code may show an "extension is not from the marketplace" warning — this is expected.

## License

[MIT](LICENSE), do what you will.
