# Deferred issues

Items intentionally out of scope for v1 of the VSCode extension. Transfer each as a GitHub issue once the repo is pushed. Order is roughly by likely priority.

---

## Support the VSCode web extension target (vscode.dev / github.dev)

**Context:** v1 ships as a desktop-only extension. `md-to-medium`'s `copyToClipboard` shells out to native tools (`osascript`, `wl-copy`, `xclip`, `xsel`, PowerShell) via `child_process`, none of which are available in the web extension host. The extension also depends on `jsdom` transitively if sanitization is enabled (also unavailable in browsers).

**What's needed:**

- Add a web extension entrypoint in `package.json` (`browser` field alongside `main`).
- Replace the clipboard write with a webview-based `navigator.clipboard.write([new ClipboardItem({ 'text/html': ... })])`. Webview must be user-activated (clipboard write requires user gesture).
- Ensure `convertMarkdown` is called with `sanitize: false` (already true in v1) so jsdom isn't pulled in.
- Verify `marked` and `marked-gfm-heading-id` work under the web extension's stripped-down Node-like runtime.
- Decide UX for "extension running in restricted environment" — disable the status bar item, or expose a shim that uses the webview path.
- Add to CI: build both `dist/extension.js` (node) and `dist/extension.web.js` (browser) targets.

**Acceptance criteria:** Extension activates and the copy command works on `vscode.dev` and inside a Codespace browser session.

---

## Make HTML sanitization configurable

**Context:** v1 calls `convertMarkdown(text, { sanitize: false })` to keep the bundle small (drops `jsdom` + `dompurify`, ~3 MB). The extension's input is the user's own editor buffer, which is trusted, so this is safe in normal use. However, some users may prefer defense-in-depth (e.g. they paste markdown from untrusted sources into their editor before converting).

**What's needed:**

- Add a setting `mdToMedium.sanitize` (boolean, default `false`).
- When `true`, the extension must include the sanitize path. Two options:
  - Bundle `jsdom` + `dompurify` into the VSIX (significant size cost).
  - Lazy-load only when enabled (still bundled, but not loaded until first use).
- Document the trade-off in the extension README.
- Decide whether the web extension target supports this at all (jsdom doesn't run in browsers — we'd need to use the browser DOM directly via DOMPurify).

**Acceptance criteria:** Setting toggles the behavior; default remains `false`; docs explain when to enable it.

---

## Add integration tests via `@vscode/test-electron`

**Context:** v1 ships with adapter-level unit tests only (vitest, mocked `vscode`). Before publishing to the marketplace, we should validate end-to-end behavior in a real extension host: command registration, activation events, status bar visibility, clipboard write under macOS/Linux/Windows.

**What's needed:**

- Add `@vscode/test-electron` and a `test:integration` script.
- Write tests that:
  - Activate the extension on opening a `.md` file.
  - Execute `mdToMedium.copyAsMediumHtml` and assert the system clipboard contains expected HTML (use platform-specific readback — `pbpaste` on macOS, `wl-paste`/`xclip -o` on Linux, PowerShell on Windows).
  - Verify status bar visibility toggles correctly across language switches.
- Wire into CI on macOS, Ubuntu (X11 via xvfb + xclip), and Windows runners.
- On Linux runners, install `xclip` as a CI step.

**Acceptance criteria:** Integration suite runs in CI on all three platforms and passes.

---

## Set up CI (GitHub Actions)

**Context:** No CI in v1. Once tests and packaging are stable, automate them.

**What's needed:**

- `.github/workflows/ci.yml`: matrix over Node 20+ × macOS/Ubuntu/Windows. Run `lint`, `typecheck`, `test`, `build`, `package`.
- Cache `node_modules` keyed on `package-lock.json`.
- Upload the produced `.vsix` as a workflow artifact for manual smoke testing.
- Optionally: a release workflow that publishes to the marketplace on tag push (gated on a stored `VSCE_PAT` secret).

**Acceptance criteria:** PRs can't merge without green CI; tagged releases produce a downloadable VSIX artifact.

---

## Publish to the VSCode Marketplace

**Context:** v1 is distributed as a manually-installed VSIX. Publishing requires a publisher account and ongoing commitment.

**What's needed:**

- Pick a publisher ID; create an Azure DevOps account and Personal Access Token for `vsce`.
- Remove `private: true` from `package.json`.
- Add an extension icon (128×128 PNG), a marketplace-quality README with screenshots / animated demos, a CHANGELOG that follows Keep a Changelog conventions.
- Add `repository`, `bugs`, `homepage`, `license` fields to `package.json`.
- Add `categories` and `keywords` for discoverability.
- Run `vsce verify-pat` and `vsce publish` (or wire it into the release workflow from issue #4).
- Decide on Open VSX Registry publishing for non-Microsoft VSCode forks (Codium, Cursor).

**Acceptance criteria:** Extension is installable via the marketplace UI in VSCode.

---

## Add an editor title button

**Context:** v1 exposes the command via the palette and a status bar item. An editor title button (the icons in the top-right of the editor pane) is another conventional entry point for "act on the current document" commands.

**What's needed:**

- Add to `contributes.menus.editor/title` with `when: "resourceLangId == markdown"` and `group: "navigation"`.
- Pick an icon (`$(clippy)` or `$(copy)`).
- Decide if the status bar item should still exist or be replaced by this — likely keep both, since they cover different user habits.

**Acceptance criteria:** Markdown editors show a button in the editor title bar that runs the copy command.

---

## Selection-aware copy command

**Context:** v1 always copies the whole document. A common convention for "Copy as X" commands is "selection if non-empty, otherwise full document". Some users may want this.

**What's needed:**

- If `editor.selection` is non-empty, pass `document.getText(editor.selection)` instead of `document.getText()`.
- Decide whether to add a separate command (`Copy Selection as Medium HTML`) or change the existing one's behavior.
- Update the status bar tooltip to reflect the active mode.

**Acceptance criteria:** Selecting a few paragraphs and running the command copies only that selection.

---

## Surface clipboard tool installation status proactively (Linux)

**Context:** v1 surfaces a clear error message via output channel when no clipboard tool is found on Linux. A more polished UX would detect this on activation and warn the user before they hit it during a copy attempt.

**What's needed:**

- On activation, on Linux only, probe for `wl-copy` / `xclip` / `xsel` (e.g. via `which`).
- If none are found, show a one-time notification with install hints.
- Persist a "don't show again" flag in `globalState`.

**Acceptance criteria:** Fresh Linux user gets warned before their first failed copy.
