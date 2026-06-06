import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('vscode', () => {
  const showInformationMessage = vi.fn().mockResolvedValue(undefined);
  const showWarningMessage = vi.fn().mockResolvedValue(undefined);
  const showErrorMessage = vi.fn().mockResolvedValue(undefined);
  const createOutputChannel = vi.fn(() => ({
    appendLine: vi.fn(),
    show: vi.fn(),
    dispose: vi.fn(),
  }));
  return {
    window: {
      activeTextEditor: undefined,
      showInformationMessage,
      showWarningMessage,
      showErrorMessage,
      createOutputChannel,
    },
  };
});

vi.mock('../converter.js', () => ({
  markdownToMediumHtml: vi.fn().mockResolvedValue('<p>html</p>'),
}));

vi.mock('../clipboard.js', () => ({
  copyHtmlToClipboard: vi.fn().mockResolvedValue(undefined),
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
  // re-apply default mock return values cleared by clearAllMocks
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

  it('shows error message when clipboard fails', async () => {
    vi.mocked(copyHtmlToClipboard).mockRejectedValueOnce(new Error('no clipboard tool'));
    await copyAsMediumHtml();
    expect(vscode.window.showErrorMessage).toHaveBeenCalled();
  });
});
