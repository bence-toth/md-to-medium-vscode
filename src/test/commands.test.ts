import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockOutputChannel = vi.hoisted(() => ({
  appendLine: vi.fn(),
  show: vi.fn(),
  dispose: vi.fn(),
}));

vi.mock('vscode', () => ({
  window: {
    activeTextEditor: undefined,
    showInformationMessage: vi.fn().mockResolvedValue(undefined),
    showWarningMessage: vi.fn().mockResolvedValue(undefined),
    showErrorMessage: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../converter.js', () => ({
  markdownToMediumHtml: vi.fn().mockResolvedValue('<p>html</p>'),
}));

vi.mock('../clipboard.js', () => ({
  copyHtmlToClipboard: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../outputChannel.js', () => ({
  getOutputChannel: vi.fn().mockReturnValue(mockOutputChannel),
  disposeOutputChannel: vi.fn(),
}));

import * as vscode from 'vscode';
import { copyAsMediumHtml } from '../commands.js';
import { markdownToMediumHtml } from '../converter.js';
import { copyHtmlToClipboard } from '../clipboard.js';

function makeEditor(text: string, languageId = 'markdown') {
  return { document: { getText: () => text, languageId } };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(markdownToMediumHtml).mockResolvedValue('<p>html</p>');
  vi.mocked(copyHtmlToClipboard).mockResolvedValue(undefined);
  (vscode.window as unknown as { activeTextEditor: unknown }).activeTextEditor =
    makeEditor('# Hello');
});

describe('copyAsMediumHtml', () => {
  it('reads full document text and calls converter + clipboard', async () => {
    await copyAsMediumHtml();
    expect(markdownToMediumHtml).toHaveBeenCalledWith('# Hello');
    expect(copyHtmlToClipboard).toHaveBeenCalledWith('<p>html</p>');
    expect(vscode.window.showInformationMessage).toHaveBeenCalledWith('Copied as Medium HTML');
  });

  it('shows a warning when no markdown editor is active', async () => {
    (vscode.window as unknown as { activeTextEditor: unknown }).activeTextEditor = makeEditor(
      '',
      'plaintext',
    );
    await copyAsMediumHtml();
    expect(markdownToMediumHtml).not.toHaveBeenCalled();
    expect(vscode.window.showWarningMessage).toHaveBeenCalled();
  });

  it('shows error and logs when converter fails', async () => {
    vi.mocked(markdownToMediumHtml).mockRejectedValueOnce(new Error('bad markdown'));
    await copyAsMediumHtml();
    expect(copyHtmlToClipboard).not.toHaveBeenCalled();
    expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
      expect.stringContaining('bad markdown'),
    );
    expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
      'Failed to convert Markdown.',
      'Show Output',
    );
  });

  it('opens output channel when user clicks Show Output after converter error', async () => {
    vi.mocked(markdownToMediumHtml).mockRejectedValueOnce(new Error('bad markdown'));
    vi.mocked(vscode.window.showErrorMessage).mockResolvedValueOnce('Show Output' as never);
    await copyAsMediumHtml();
    expect(mockOutputChannel.show).toHaveBeenCalled();
  });

  it('shows error message when clipboard fails', async () => {
    vi.mocked(copyHtmlToClipboard).mockRejectedValueOnce(new Error('no clipboard tool'));
    await copyAsMediumHtml();
    expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
      'Failed to copy to clipboard.',
      'Show Output',
    );
  });

  it('opens output channel when user clicks Show Output after clipboard error', async () => {
    vi.mocked(copyHtmlToClipboard).mockRejectedValueOnce(new Error('no clipboard tool'));
    vi.mocked(vscode.window.showErrorMessage).mockResolvedValueOnce('Show Output' as never);
    await copyAsMediumHtml();
    expect(mockOutputChannel.show).toHaveBeenCalled();
  });

  it('appends Linux clipboard hint on Linux', async () => {
    vi.mocked(copyHtmlToClipboard).mockRejectedValueOnce(new Error('no clipboard tool'));
    Object.defineProperty(process, 'platform', { value: 'linux', configurable: true });
    await copyAsMediumHtml();
    Object.defineProperty(process, 'platform', { value: 'darwin', configurable: true });
    expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
      expect.stringContaining('wl-clipboard'),
    );
  });

  it('handles non-Error thrown from converter', async () => {
    vi.mocked(markdownToMediumHtml).mockRejectedValueOnce('string error');
    await copyAsMediumHtml();
    expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
      expect.stringContaining('string error'),
    );
  });

  it('handles non-Error thrown from clipboard', async () => {
    vi.mocked(copyHtmlToClipboard).mockRejectedValueOnce('clipboard string error');
    await copyAsMediumHtml();
    expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
      expect.stringContaining('clipboard string error'),
    );
  });
});
