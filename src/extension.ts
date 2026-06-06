import * as vscode from 'vscode';
import { copyAsMediumHtml } from './commands.js';
import { disposeOutputChannel } from './outputChannel.js';
import { createStatusBarItem } from './statusBar.js';

export function activate(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.commands.registerCommand('mdToMedium.copyAsMediumHtml', copyAsMediumHtml),
  );
  createStatusBarItem(context);
}

export function deactivate(): void {
  disposeOutputChannel();
}
