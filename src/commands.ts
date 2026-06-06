import * as vscode from 'vscode';
import { markdownToMediumHtml } from './converter.js';
import { copyHtmlToClipboard } from './clipboard.js';
import { getOutputChannel } from './outputChannel.js';

const LINUX_CLIPBOARD_HINT =
  'On Linux, a clipboard tool is required. Install one of: wl-clipboard (Wayland), xclip, or xsel.';

export async function copyAsMediumHtml(): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor || editor.document.languageId !== 'markdown') {
    await vscode.window.showWarningMessage('Open a Markdown file to use Markdown to Medium.');
    return;
  }

  const text = editor.document.getText();

  let html: string;
  try {
    html = await markdownToMediumHtml(text);
  } catch (err) {
    await showError('Failed to convert Markdown', err);
    return;
  }

  try {
    await copyHtmlToClipboard(html);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const ch = getOutputChannel();
    ch.appendLine('Clipboard error: ' + message);
    if (process.platform === 'linux') {
      ch.appendLine(LINUX_CLIPBOARD_HINT);
    }
    const action = await vscode.window.showErrorMessage(
      'Failed to copy to clipboard.',
      'Show Output',
    );
    if (action === 'Show Output') {
      ch.show();
    }
    return;
  }

  await vscode.window.showInformationMessage('Copied as Medium HTML');
}

async function showError(prefix: string, err: unknown): Promise<void> {
  const message = err instanceof Error ? err.message : String(err);
  const ch = getOutputChannel();
  ch.appendLine(prefix + ': ' + message);
  const action = await vscode.window.showErrorMessage(prefix + '.', 'Show Output');
  if (action === 'Show Output') {
    ch.show();
  }
}
