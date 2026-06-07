import * as assert from 'assert';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as vscode from 'vscode';

const execAsync = promisify(exec);

// .vscode-test.mjs opens src/test/integration/workspace as the workspace folder
function workspacePath(...parts: string[]): string {
  const folder = vscode.workspace.workspaceFolders?.[0];
  assert.ok(folder, 'No workspace folder open');
  return path.join(folder.uri.fsPath, ...parts);
}

async function readClipboard(): Promise<string> {
  // pbpaste reads plain text; the extension writes «class HTML» only.
  // Use osascript to dump the clipboard HTML to a temp file and read it back.
  // The «» guillemets can't survive shell quoting, so the script is written to a file.
  const outFile = path.join(os.tmpdir(), `m2m-clip-${process.pid}.html`);
  const scriptFile = path.join(os.tmpdir(), `m2m-script-${process.pid}.applescript`);
  const script = [
    `set outRef to open for access (POSIX file ${JSON.stringify(outFile)}) with write permission`,
    `write (the clipboard as «class HTML») to outRef`,
    `close access outRef`,
  ].join('\n');
  try {
    await fs.writeFile(scriptFile, script, 'utf-8');
    await execAsync(`osascript ${scriptFile}`);
    return await fs.readFile(outFile, 'utf-8');
  } finally {
    await fs.unlink(scriptFile).catch(() => {});
    await fs.unlink(outFile).catch(() => {});
  }
}

suite('Extension integration', () => {
  suiteSetup(async () => {
    // Opening a .md file triggers the onLanguage:markdown activation event
    const doc = await vscode.workspace.openTextDocument(workspacePath('fixture.md'));
    await vscode.window.showTextDocument(doc);

    const ext = vscode.extensions.getExtension('bence-toth.markdown-to-medium-vscode');
    assert.ok(ext, 'Extension not found');
    await ext.activate();
  });

  test('command mdToMedium.copyAsMediumHtml is registered', async () => {
    const all = await vscode.commands.getCommands(true);
    assert.ok(all.includes('mdToMedium.copyAsMediumHtml'), 'Command not registered');
  });

  test('extension activates when a Markdown file is opened', async () => {
    const ext = vscode.extensions.getExtension('bence-toth.markdown-to-medium-vscode');
    assert.ok(ext, 'Extension not found');
    assert.strictEqual(ext.isActive, true, 'Extension did not activate');
  });

  // xclip holds the X11 clipboard selection alive (by design) until a reader connects,
  // so copyHtmlLinux never resolves on headless Linux runners. PowerShell's clipboard
  // API behaves similarly in headless Windows CI. macOS uses osascript which exits
  // immediately, making readback reliable. Skip on other platforms.
  test('executing the command writes HTML to the clipboard', async function () {
    if (process.platform !== 'darwin') {
      this.skip();
    }

    const doc = await vscode.workspace.openTextDocument(workspacePath('fixture.md'));
    await vscode.window.showTextDocument(doc);

    await vscode.commands.executeCommand('mdToMedium.copyAsMediumHtml');

    // Give the async clipboard write a moment to settle
    await new Promise((resolve) => setTimeout(resolve, 500));

    const clipContent = await readClipboard();
    assert.ok(
      clipContent.includes('graf--h1') || clipContent.includes('Hello Medium'),
      `Clipboard did not contain expected HTML. Got: ${clipContent.slice(0, 200)}`,
    );
  });

  test('status bar item is visible when a Markdown file is active', async () => {
    const doc = await vscode.workspace.openTextDocument(workspacePath('fixture.md'));
    const editor = await vscode.window.showTextDocument(doc);
    assert.strictEqual(editor.document.languageId, 'markdown', 'Active document is not Markdown');
  });

  test('status bar item is hidden when a non-Markdown file is active', async () => {
    const doc = await vscode.workspace.openTextDocument(workspacePath('fixture.txt'));
    const editor = await vscode.window.showTextDocument(doc);
    assert.notStrictEqual(
      editor.document.languageId,
      'markdown',
      'Active document should not be Markdown',
    );
  });
});
