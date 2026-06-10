import * as vscode from 'vscode';

const ITEM_TEXT = '$(preview) Copy to Medium';

let item: vscode.StatusBarItem | undefined;
let flashTimer: ReturnType<typeof setTimeout> | undefined;

export function isMarkdownEditor(editor: vscode.TextEditor | undefined): boolean {
  return editor?.document.languageId === 'markdown';
}

export function createStatusBarItem(context: vscode.ExtensionContext): vscode.StatusBarItem {
  item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 0);
  item.text = ITEM_TEXT;
  item.tooltip = 'Copy as Medium HTML';
  item.command = 'mdToMedium.copyAsMediumHtml';
  context.subscriptions.push(item);

  const update = (editor: vscode.TextEditor | undefined) => {
    if (isMarkdownEditor(editor)) {
      item!.show();
    } else {
      item!.hide();
    }
  };

  update(vscode.window.activeTextEditor);

  context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(update));

  return item;
}

export function flashStatusBarItem(
  text: string,
  duration: number,
  kind: 'success' | 'error',
): void {
  if (!item) {
    return;
  }
  if (flashTimer) {
    clearTimeout(flashTimer);
  }
  item.text = text;
  if (kind === 'error') {
    item.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
    item.color = undefined;
  } else {
    item.color = new vscode.ThemeColor('testing.iconPassed');
    item.backgroundColor = undefined;
  }
  flashTimer = setTimeout(() => {
    flashTimer = undefined;
    item!.text = ITEM_TEXT;
    item!.color = undefined;
    item!.backgroundColor = undefined;
  }, duration);
}

export function disposeStatusBarItem(): void {
  if (flashTimer) {
    clearTimeout(flashTimer);
    flashTimer = undefined;
  }
  item?.dispose();
  item = undefined;
}
