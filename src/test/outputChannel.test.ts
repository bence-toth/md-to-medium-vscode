import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockChannel = vi.hoisted(() => ({ appendLine: vi.fn(), show: vi.fn(), dispose: vi.fn() }));

vi.mock('vscode', () => ({
  window: {
    createOutputChannel: vi.fn().mockReturnValue(mockChannel),
  },
}));

import * as vscode from 'vscode';
import { getOutputChannel, disposeOutputChannel } from '../outputChannel.js';

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(vscode.window.createOutputChannel).mockReturnValue(mockChannel);
  disposeOutputChannel();
});

describe('getOutputChannel', () => {
  it('creates a channel on first call', () => {
    getOutputChannel();
    expect(vscode.window.createOutputChannel).toHaveBeenCalledWith('Markdown to Medium');
  });

  it('reuses the same channel on subsequent calls', () => {
    const first = getOutputChannel();
    const second = getOutputChannel();
    expect(first).toBe(second);
    expect(vscode.window.createOutputChannel).toHaveBeenCalledTimes(1);
  });
});

describe('disposeOutputChannel', () => {
  it('disposes the channel and allows a new one to be created', () => {
    getOutputChannel();
    disposeOutputChannel();
    expect(mockChannel.dispose).toHaveBeenCalled();
    vi.clearAllMocks();
    vi.mocked(vscode.window.createOutputChannel).mockReturnValue(mockChannel);
    getOutputChannel();
    expect(vscode.window.createOutputChannel).toHaveBeenCalledTimes(1);
  });

  it('is a no-op when no channel exists', () => {
    expect(() => disposeOutputChannel()).not.toThrow();
  });
});
