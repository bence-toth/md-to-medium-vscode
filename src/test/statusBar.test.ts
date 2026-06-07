import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockItem = vi.hoisted(() => ({
  show: vi.fn(),
  hide: vi.fn(),
  dispose: vi.fn(),
  text: '',
  color: undefined as unknown,
  backgroundColor: undefined as unknown,
}));
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
  ThemeColor: vi.fn((id: string) => ({ id })),
}));

import * as vscode from 'vscode';
import {
  isMarkdownEditor,
  createStatusBarItem,
  flashStatusBarItem,
  disposeStatusBarItem,
} from '../statusBar.js';

function makeEditor(languageId: string) {
  return { document: { languageId } } as never;
}

function makeContext() {
  return { subscriptions: { push: vi.fn() } } as never;
}

beforeEach(() => {
  vi.clearAllMocks();
  editorChangeCallback = undefined;
  disposeStatusBarItem();
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

describe('flashStatusBarItem', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('is a no-op when no status bar item has been created', () => {
    expect(() => flashStatusBarItem('$(check) Done', 3000, 'success')).not.toThrow();
  });

  it('updates the item text immediately', () => {
    createStatusBarItem(makeContext());
    flashStatusBarItem('$(check) Copied', 3000, 'success');
    expect(mockItem.text).toBe('$(check) Copied');
  });

  it('sets a green color for success', () => {
    createStatusBarItem(makeContext());
    flashStatusBarItem('$(check) Copied', 3000, 'success');
    expect(mockItem.color).toEqual({ id: 'testing.iconPassed' });
    expect(mockItem.backgroundColor).toBeUndefined();
  });

  it('sets an error background for error', () => {
    createStatusBarItem(makeContext());
    flashStatusBarItem('$(error) Failed', 3000, 'error');
    expect(mockItem.backgroundColor).toEqual({ id: 'statusBarItem.errorBackground' });
    expect(mockItem.color).toBeUndefined();
  });

  it('restores text and clears colors after the duration', () => {
    createStatusBarItem(makeContext());
    flashStatusBarItem('$(check) Copied', 3000, 'success');
    vi.advanceTimersByTime(3000);
    expect(mockItem.text).toBe('$(preview) Copy to Medium');
    expect(mockItem.color).toBeUndefined();
    expect(mockItem.backgroundColor).toBeUndefined();
  });
});

describe('disposeStatusBarItem', () => {
  it('disposes the item', () => {
    createStatusBarItem(makeContext());
    disposeStatusBarItem();
    expect(mockItem.dispose).toHaveBeenCalled();
  });

  it('is a no-op when no item exists', () => {
    expect(() => disposeStatusBarItem()).not.toThrow();
  });
});
