import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockItem = vi.hoisted(() => ({ show: vi.fn(), hide: vi.fn(), dispose: vi.fn() }));
let editorChangeCallback: ((editor: unknown) => void) | undefined;

vi.mock('vscode', () => ({
  window: {
    activeTextEditor: undefined,
    createStatusBarItem: vi.fn().mockReturnValue(mockItem),
    onDidChangeActiveTextEditor: vi.fn((cb) => {
      editorChangeCallback = cb;
      return { dispose: vi.fn() };
    }),
  },
  StatusBarAlignment: { Right: 2 },
}));

import * as vscode from 'vscode';
import { isMarkdownEditor, createStatusBarItem } from '../statusBar.js';

function makeEditor(languageId: string) {
  return { document: { languageId } } as never;
}

function makeContext() {
  return { subscriptions: { push: vi.fn() } } as never;
}

beforeEach(() => {
  vi.clearAllMocks();
  editorChangeCallback = undefined;
  (vscode.window as unknown as { activeTextEditor: unknown }).activeTextEditor = undefined;
  vi.mocked(vscode.window.createStatusBarItem).mockReturnValue(mockItem);
  vi.mocked(vscode.window.onDidChangeActiveTextEditor).mockImplementation((cb) => {
    editorChangeCallback = cb as (editor: unknown) => void;
    return { dispose: vi.fn() } as never;
  });
});

describe('isMarkdownEditor', () => {
  it('returns true for a markdown editor', () => {
    expect(isMarkdownEditor(makeEditor('markdown'))).toBe(true);
  });

  it('returns false for a plaintext editor', () => {
    expect(isMarkdownEditor(makeEditor('plaintext'))).toBe(false);
  });

  it('returns false when editor is undefined', () => {
    expect(isMarkdownEditor(undefined)).toBe(false);
  });
});

describe('createStatusBarItem', () => {
  it('creates a status bar item and pushes it to subscriptions', () => {
    const context = makeContext();
    createStatusBarItem(context);
    expect(vscode.window.createStatusBarItem).toHaveBeenCalled();
    expect(context.subscriptions.push).toHaveBeenCalled();
  });

  it('shows the item when the active editor is markdown on creation', () => {
    (vscode.window as unknown as { activeTextEditor: unknown }).activeTextEditor =
      makeEditor('markdown');
    createStatusBarItem(makeContext());
    expect(mockItem.show).toHaveBeenCalled();
  });

  it('hides the item when the active editor is not markdown on creation', () => {
    (vscode.window as unknown as { activeTextEditor: unknown }).activeTextEditor =
      makeEditor('plaintext');
    createStatusBarItem(makeContext());
    expect(mockItem.hide).toHaveBeenCalled();
  });

  it('shows the item when the active editor changes to markdown', () => {
    createStatusBarItem(makeContext());
    editorChangeCallback?.(makeEditor('markdown'));
    expect(mockItem.show).toHaveBeenCalled();
  });

  it('hides the item when the active editor changes to non-markdown', () => {
    createStatusBarItem(makeContext());
    editorChangeCallback?.(makeEditor('plaintext'));
    expect(mockItem.hide).toHaveBeenCalled();
  });
});
