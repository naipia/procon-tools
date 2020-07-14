import * as vscode from 'vscode';
import { Configuration } from './configuration';

export function getActiveFilePath(conf: Configuration): string | undefined {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    return undefined;
  }

  const activeFilePath: string = editor.document.fileName;
  if (activeFilePath.split('.').pop() !== conf.extension) {
    return undefined;
  }
  return activeFilePath;
}
