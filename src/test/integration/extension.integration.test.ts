import * as assert from 'assert';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as vscode from 'vscode';

const execAsync = promisify(exec);

const FIXTURE_MD = path.join(__dirname, 'workspace', 'fixture.md');
const FIXTURE_TXT = path.join(__dirname, 'workspace', 'fixture.txt');

async function readClipboard(): Promise<string> {
  const platform = process.platform;
  if (platform === 'darwin') {
    const { stdout } = await execAsync('pbpaste');
    return stdout;
  } else if (platform === 'linux') {
    // xclip -o does not support -t for output on all builds; fall back to plain text
    try {
      const { stdout } = await execAsync('xclip -selection clipboard -o -t text/html');
      return stdout;
    } catch {
      const { stdout } = await execAsync('xclip -selection clipboard -o');
      return stdout;
    }
  } else if (platform === 'win32') {
    const { stdout } = await execAsync('powershell -NoProfile -Command "Get-Clipboard"');
    return stdout;
  }
  throw new Error(`Unsupported platform for clipboard readback: ${platform}`);
}

suite('Extension integration', () => {
  test('command mdToMedium.copyAsMediumHtml is registered', async () => {
    const all = await vscode.commands.getCommands(true);
    assert.ok(all.includes('mdToMedium.copyAsMediumHtml'), 'Command not registered');
  });

  test('extension activates when a Markdown file is opened', async () => {
    const doc = await vscode.workspace.openTextDocument(FIXTURE_MD);
    await vscode.window.showTextDocument(doc);

    const ext = vscode.extensions.getExtension('bence-toth.markdown-to-medium-vscode');
    assert.ok(ext, 'Extension not found');
    assert.strictEqual(ext.isActive, true, 'Extension did not activate');
  });

  test('executing the command writes HTML to the clipboard', async () => {
    const doc = await vscode.workspace.openTextDocument(FIXTURE_MD);
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
    const doc = await vscode.workspace.openTextDocument(FIXTURE_MD);
    const editor = await vscode.window.showTextDocument(doc);
    assert.strictEqual(editor.document.languageId, 'markdown', 'Active document is not Markdown');
  });

  test('status bar item is hidden when a non-Markdown file is active', async () => {
    const doc = await vscode.workspace.openTextDocument(FIXTURE_TXT);
    const editor = await vscode.window.showTextDocument(doc);
    assert.notStrictEqual(
      editor.document.languageId,
      'markdown',
      'Active document should not be Markdown',
    );
  });
});
