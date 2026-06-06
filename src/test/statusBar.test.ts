import { describe, it, expect, vi } from 'vitest';

vi.mock('vscode', () => ({
  window: {
    activeTextEditor: undefined,
    createStatusBarItem: vi.fn(() => ({ show: vi.fn(), hide: vi.fn(), dispose: vi.fn() })),
    onDidChangeActiveTextEditor: vi.fn(() => ({ dispose: vi.fn() })),
  },
  StatusBarAlignment: { Right: 2 },
}));

import { isMarkdownEditor } from '../statusBar.js';

function makeEditor(languageId: string) {
  return { document: { languageId } } as never;
}

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
