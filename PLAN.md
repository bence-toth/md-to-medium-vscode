# Markdown to Medium — VSCode extension

A separate VSCode extension that consumes the published `md-to-medium` npm package. v1 targets desktop only and is distributed as a VSIX without marketplace publishing. Deferred work (web target, configurable sanitization, integration tests, CI, marketplace publish, etc.) lives in [ISSUES.md](ISSUES.md).

## Feature surface

- Command palette entry: `Markdown to Medium: Copy as Medium HTML`.
- Status bar button visible only when the active editor is a Markdown file.
- Both actions read the active editor's whole document, run it through `convertMarkdown`, and put rich HTML on the system clipboard.
- Operates on `document.getText()` (in-memory), not the file on disk — unsaved edits are included.

## Constraints from `md-to-medium`

- **ESM-only**, Node ≥ 20. The extension bundles to CJS (VSCode's default) and reaches the library via dynamic `import()`.
- **`copyToClipboard` shells out** to OS-native tools (`osascript` / `wl-copy` / `xclip` / `xsel` / PowerShell) to write `text/html` to the clipboard. Plain-text writes via `vscode.env.clipboard.writeText()` are rejected by Medium's editor — that's the whole reason this tool exists.
  - On Linux, requires `wl-clipboard`, `xclip`, or `xsel`. Surface clearly when missing.
  - Incompatible with the web extension host (no `child_process`) — see [ISSUES.md](ISSUES.md).
- **Subpath exports** (`./converter`, `./clipboard`, `./sanitize`) are already shipped; the extension imports narrowly to keep the bundle small.

## Activation & UI wiring

- `activationEvents: ["onLanguage:markdown"]` keeps activation lazy.
- Status bar item: created on activation; visibility toggled imperatively in `window.onDidChangeActiveTextEditor` based on `editor.document.languageId === 'markdown'`. Status bar items don't support `when` clauses — visibility must be imperative.
- Command palette entry: gated with `contributes.menus.commandPalette[].when: "resourceLangId == markdown"`.

## UX choices

- **Whole document, always.** No selection-aware behavior in v1.
- **Sanitize off.** `convertMarkdown(text, { sanitize: false })` — input is the user's own buffer (trusted), and skipping sanitization drops `jsdom` + `dompurify` from the bundle.
- **Success:** non-modal `window.showInformationMessage('Copied as Medium HTML')`.
- **Errors:** an output channel `Markdown to Medium`. On clipboard failure, `showErrorMessage` with a `Show Output` action; on Linux, the output includes the install hint for missing clipboard tools.
- **Status bar item:** `StatusBarAlignment.Right`, low priority, icon `$(clippy)`, label `Medium`, tooltip names the action.

---

# Implementation plan

This section is the actionable plan: phases broken down into commit-sized steps. Each step is intended to be a single, self-contained commit with a green build at HEAD.

## Plan validation against the published library

`md-to-medium@1.0.0` was inspected (`npm view` + tarball). Findings that update the design notes above:

- **Subpath exports already exist.** `./converter`, `./clipboard`, `./sanitize` are live in `package.json#exports`. The "wait for subpath exports to land" caveat is moot.
- **Sanitize default still pulls jsdom.** `convertMarkdown` defaults to `sanitize: true`, and on that path `converter.js` does a dynamic `import('./sanitize.js')` which loads `jsdom`+`dompurify` at runtime. Importing from `md-to-medium/converter` does **not**, by itself, drop `jsdom` from the bundle.
- **To actually skip jsdom**, the extension must call `convertMarkdown(text, { sanitize: false })`. The input is the user's own editor buffer (trusted), so this is acceptable. (See [ISSUES.md](ISSUES.md) for the option of making this user-configurable later.)
- **Library is ESM, Node ≥ 20.** Module-format choice is real — see Phase 1.
- **`copyToClipboard` shells out** (osascript / wl-copy / xclip / xsel / PowerShell). Fine for desktop; incompatible with the web-extension target. Web target is deferred — see [ISSUES.md](ISSUES.md).

## Decisions locked in

These shape the rest of the plan; revisit only if a concrete reason appears.

| Decision           | Choice                                                                                      |
| ------------------ | ------------------------------------------------------------------------------------------- |
| Language           | **TypeScript**                                                                              |
| Bundler            | **esbuild**, single `dist/extension.js`, `vscode` external                                  |
| Target             | **Desktop only** for v1 (web target → ISSUES.md)                                            |
| Selection handling | **Always operate on the whole document**                                                    |
| Sanitization       | **`sanitize: false`** — drops jsdom/DOMPurify from the bundle (configurability → ISSUES.md) |
| Settings           | **None in v1**                                                                              |
| Tests              | **Unit tests for the adapter only** (integration tests → ISSUES.md)                         |
| Commit granularity | **One concern per commit**                                                                  |

## Phase 0 — Repository scaffolding

Goal: empty repo → buildable, lintable, formattable TypeScript project with `vscode` types resolving. No extension behavior yet.

1. `chore: initialize git repo and add .gitignore` — `git init`, add `node_modules/`, `dist/`, `out/`, `*.vsix`, `.vscode-test/`, `coverage/`.
2. `chore: add LICENSE` — MIT, matching the underlying library.
3. `chore: add package.json with extension manifest skeleton` — `name: markdown-to-medium-vscode`, `publisher: <tbd>`, `engines.vscode`, `categories: ["Other", "Formatters"]`, `main: ./dist/extension.js`, empty `contributes`, no `activationEvents` yet. Mark `private: true` until we're ready to publish.
4. `chore: add tsconfig.json` — `target: ES2022`, `module: Node16`, `moduleResolution: Node16`, `strict: true`, `outDir: out` (used only for type-checking; bundle goes to `dist/` via esbuild), `rootDir: src`.
5. `chore: add prettier config` — match the library's style (single quotes, semi true).
6. `chore: add eslint config` — `@typescript-eslint`, recommended ruleset; mirror library lint posture.
7. `chore: install vscode types and tooling` — `@types/vscode` pinned to the manifest's `engines.vscode` lower bound, `@types/node@^20`, `typescript`, `esbuild`, `eslint`, `prettier`.
8. `chore: add empty src/extension.ts with activate/deactivate stubs` — exports `activate(context)` and `deactivate()`, both no-ops. Confirms tsc compiles.
9. `chore: add esbuild build script` — `scripts/build.mjs` that bundles `src/extension.ts` → `dist/extension.js`, `platform: node`, `format: cjs` (VSCode loads CJS by default; we use dynamic `import()` for the ESM-only library), `external: ['vscode']`, sourcemap on for dev. Wire `npm run build` and `npm run watch`.
10. `chore: add npm scripts` — `lint`, `format`, `format:check`, `typecheck` (`tsc --noEmit`), `build`, `watch`.

Exit criteria: `npm run build` produces `dist/extension.js`. `npm run typecheck`, `npm run lint`, `npm run format:check` all pass.

## Phase 1 — Library integration spike

Goal: prove we can call `convertMarkdown` from a CJS-bundled extension before wiring any UI. This is where ESM-from-CJS lives or dies.

1. `feat: add md-to-medium dependency` — `npm i md-to-medium@^1.0.0`.
2. `feat: add converter adapter module with dynamic import` — `src/converter.ts` exports `async function markdownToMediumHtml(markdown: string): Promise<string>`. Internally `const { convertMarkdown } = await import('md-to-medium/converter');` and calls it with `{ sanitize: false }`. Hand-typed against the library's `.d.ts`.
3. `chore: configure esbuild to externalize md-to-medium` — add `md-to-medium` (and its transitive `marked`, `marked-gfm-heading-id`) to esbuild `external`. They'll be loaded via dynamic `import()` from the runtime `node_modules` shipped inside the VSIX. Document the choice in a comment.
4. `chore: configure VSIX file inclusion` — add `.vscodeignore` excluding `src/`, `node_modules/.cache`, `tsconfig.json`, `scripts/`, dev deps, tests; explicitly **include** `node_modules/md-to-medium/**`, `node_modules/marked/**`, `node_modules/marked-gfm-heading-id/**`. Run `vsce ls` (added in Phase 4) later to verify.
5. `test: add unit test for the converter adapter` — set up `vitest` (matches library), test that `markdownToMediumHtml('# Hello')` returns HTML containing `class="graf graf--h1"`. Confirms dynamic import works under vitest's Node runtime.

Exit criteria: `npm test` passes. Adapter is callable.

## Phase 2 — Command + clipboard

Goal: a working `Markdown to Medium: Copy as Medium HTML` command, callable from the palette, that copies rich HTML.

1. `feat: register copy-as-medium-html command` — in `activate`, register `mdToMedium.copyAsMediumHtml`. Body: get active editor, read `document.getText()`, call adapter, call clipboard helper (next step), show info message. Push to `context.subscriptions`.
2. `feat: contribute the command in package.json` — add to `contributes.commands` with title `Markdown to Medium: Copy as Medium HTML`. Gate palette visibility with `contributes.menus.commandPalette[].when: "resourceLangId == markdown"`.
3. `feat: set activationEvents to onLanguage:markdown` — keeps activation lazy.
4. `feat: add clipboard helper that delegates to md-to-medium/clipboard` — `src/clipboard.ts` does `const { copyToClipboard } = await import('md-to-medium/clipboard');` and calls it. Single dynamic import boundary keeps the bundle clean.
5. `feat: handle missing/non-markdown editor gracefully` — if no active editor or `languageId !== 'markdown'`, show a warning message and bail. (The palette gate handles the common case, but the command can still be invoked via `vscode.commands.executeCommand`.)
6. `feat: surface clipboard errors with output channel` — create an output channel `Markdown to Medium`, log errors there, show `showErrorMessage` with a `Show Output` action. On Linux, detect the "no clipboard tool found" message and include the install hint in the output.
7. `test: unit-test the command handler` — mock `vscode` with a fake editor + clipboard helper; assert handler reads full document text, calls converter, calls clipboard, shows success notification.

Exit criteria: F5 in VSCode launches the Extension Development Host; opening a `.md` file and running the command from the palette copies HTML to the clipboard; pasting into Medium produces formatted content.

## Phase 3 — Status bar entry point

Goal: a status bar button that runs the same command, visible only for Markdown editors.

1. `feat: create status bar item on activation` — `StatusBarAlignment.Right`, low priority. Text `$(clippy) Medium`, tooltip `Copy as Medium HTML`, `command: mdToMedium.copyAsMediumHtml`. Push to `context.subscriptions`.
2. `feat: toggle status bar visibility based on active editor language` — subscribe to `window.onDidChangeActiveTextEditor`; show when `editor?.document.languageId === 'markdown'`, hide otherwise. Run the same check once at activation for the editor open at startup.
3. `feat: also re-check on language change` — subscribe to `workspace.onDidChangeTextDocument` is too noisy; use `workspace.onDidOpenTextDocument` + the `languages.setTextDocumentLanguage`-driven `onDidChangeActiveTextEditor` flow. Keep this minimal — one extra listener for `window.onDidChangeVisibleTextEditors` if needed in practice.
4. `test: unit-test status bar visibility logic` — extract the "should be visible for this editor" predicate into a pure function and test it with markdown / plaintext / undefined inputs.

Exit criteria: status bar item appears only on Markdown files, click triggers the copy.

## Phase 4 — Polish & local distribution

Goal: a VSIX you can install on your own machine and share with collaborators, without publishing.

1. `chore: add icon and README` — 128×128 PNG icon. Brief README pointing to the underlying library. (Extension README is required for marketplace later; the icon is good to have early so it's reflected in VSIX installs.)
2. `chore: write CHANGELOG.md` — VSCode reads this for the marketplace; keep it ready.
3. `chore: add @vscode/vsce as devDependency` and a `package` script — `vsce package --no-dependencies` (we already bundle and explicitly list runtime deps; suppress `npm install --production` which mishandles ESM).
4. `chore: verify VSIX contents and size` — run `vsce ls` and `unzip -l *.vsix`. Confirm `dist/extension.js` is present, `node_modules/md-to-medium/**` is present, source is **not** present, and total size is reasonable (target < 1 MB without sanitize, mostly `marked`).
5. `docs: document local install` — `code --install-extension markdown-to-medium-vscode-<ver>.vsix`. Note that the extension is unsigned and unpublished.
6. `chore: smoke test the VSIX on a clean profile` — `code --user-data-dir /tmp/vscode-test --install-extension *.vsix`, open a markdown file, run command, paste into Medium. Document the steps in a `SMOKETEST.md` (so future-you can repeat).

Exit criteria: a `.vsix` you can `code --install-extension` on any desktop VSCode and use immediately.

## Phase 5 — Pre-marketplace prep (deferred until you choose to publish)

Not part of v1 distribution, but listed here so we don't accidentally close off these paths. Each item has a corresponding entry in [ISSUES.md](ISSUES.md).

1. Pick a publisher ID and create the Azure DevOps PAT.
2. Add integration tests via `@vscode/test-electron` (macOS + Linux runners).
3. Add CI (GitHub Actions): typecheck, lint, test, package.
4. Reconsider sanitize-on/off — possibly expose as a setting.
5. Reconsider web extension target — would reroute clipboard via webview.
6. Write a marketplace-quality README with screenshots/animated demo.
7. `vsce publish`.

## Test strategy summary

Per the locked-in decision, v1 ships with **adapter-level unit tests only**:

- `markdownToMediumHtml` returns expected HTML for a few representative inputs.
- The command handler, with `vscode` and clipboard helper mocked, reads `document.getText()` and forwards correctly.
- The status bar visibility predicate is a pure function and trivially tested.

All other manual verification happens via the Extension Development Host (F5) and the Phase 4 smoke test. Integration tests are tracked in ISSUES.md.

## Risks & mitigations

| Risk                                                   | Mitigation                                                                                                                                                                            |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ESM library import fails under bundled CJS extension   | Phase 1 spike + adapter unit test catches it before any UI is built.                                                                                                                  |
| VSIX bloat from `marked` / `marked-gfm-heading-id`     | Phase 4 step 4 explicitly measures size. If unacceptable, switch to bundling `md-to-medium`'s converter directly (it's tiny — ~60 LOC) and keeping `marked` as the only external dep. |
| Linux clipboard tool missing on user's system          | Phase 2 step 6 surfaces a clear error with install hint via output channel.                                                                                                           |
| `@types/vscode` version drift vs `engines.vscode`      | Pin both to the same version in `package.json`.                                                                                                                                       |
| `vsce package` re-running npm install and breaking ESM | Phase 4 uses `--no-dependencies` and verifies VSIX contents before declaring done.                                                                                                    |
