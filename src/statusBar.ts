import * as vscode from 'vscode';

export function isMarkdownEditor(editor: vscode.TextEditor | undefined): boolean {
  return editor?.document.languageId === 'markdown';
}

export function createStatusBarItem(context: vscode.ExtensionContext): vscode.StatusBarItem {
  const item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 0);
  item.text = '$(clippy) Medium';
  item.tooltip = 'Copy as Medium HTML';
  item.command = 'mdToMedium.copyAsMediumHtml';
  context.subscriptions.push(item);

  const update = (editor: vscode.TextEditor | undefined) => {
    if (isMarkdownEditor(editor)) {
      item.show();
    } else {
      item.hide();
    }
  };

  update(vscode.window.activeTextEditor);

  context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(update));

  return item;
}
