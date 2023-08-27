import * as vscode from 'vscode';
import * as path from 'path';

import { Configuration } from '../configuration';
import * as util from '../util';
import * as webview from '../webview';
import { runAllTestcases, build } from '../run';

/**
 * Procon: Run tests
 */
export async function runtest(
  context: vscode.ExtensionContext,
  conf: Configuration,
  panel: vscode.WebviewPanel
): Promise<void> {
  const activeFilePath: string | undefined = util.getActiveFilePath(conf);
  if (!activeFilePath) {
    return;
  }
  const sourceFile: string = path.basename(activeFilePath);
  const taskDir: string = path.dirname(activeFilePath) + '/';
  const testcasesDir: string = taskDir + 'testcases/';
  const buildCommand: string = conf.build.replace('%S', activeFilePath);

  const error: string | undefined = await build(buildCommand);
  if (error) {
    webview.updateCompilationError(context, panel, sourceFile, error);
    return;
  }

  const executions: Execution[] = await runAllTestcases(
    testcasesDir,
    conf.command
  );

  webview.updateResults(context, panel, sourceFile, executions);
  vscode.window.showInformationMessage('All tests have been completed!');
}
