import { describe, it, expect, vi } from 'vitest';

vi.mock('vscode', () => ({
  window: {
    activeTextEditor: undefined,
    createStatusBarItem: vi.fn().mockReturnValue({ show: vi.fn(), hide: vi.fn() }),
    onDidChangeActiveTextEditor: vi.fn().mockReturnValue({ dispose: vi.fn() }),
  },
  StatusBarAlignment: { Right: 2 },
  commands: {
    registerCommand: vi.fn().mockReturnValue({ dispose: vi.fn() }),
  },
}));

vi.mock('../outputChannel.js', () => ({
  disposeOutputChannel: vi.fn(),
  getOutputChannel: vi.fn(),
}));

import * as vscode from 'vscode';
import { activate, deactivate } from '../extension.js';
import { disposeOutputChannel } from '../outputChannel.js';

function makeContext() {
  return { subscriptions: { push: vi.fn() } } as never;
}

describe('activate', () => {
  it('registers the copyAsMediumHtml command', () => {
    activate(makeContext());
    expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
      'mdToMedium.copyAsMediumHtml',
      expect.any(Function),
    );
  });

  it('creates a status bar item', () => {
    activate(makeContext());
    expect(vscode.window.createStatusBarItem).toHaveBeenCalled();
  });
});

describe('deactivate', () => {
  it('disposes the output channel', () => {
    deactivate();
    expect(disposeOutputChannel).toHaveBeenCalled();
  });
});
