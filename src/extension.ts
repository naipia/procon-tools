import * as vscode from 'vscode';
import * as path from 'path';

import { Configuration } from './configuration';
import * as webview from './webview';
import { build, execute } from './run';
import { getActiveFilePath } from './util';
import * as contest from './commands/contest';
import * as runtest from './commands/runtest';
import * as login from './commands/login';
import * as submit from './commands/submit';

/**
 * エントリーポイント（package.jsonのactivationEvents発生時に実行）
 * 拡張機能のコマンド登録
 * @param context
 */
export function activate(context: vscode.ExtensionContext): void {
  const conf = new Configuration();
  let panel: vscode.WebviewPanel | undefined = undefined;

  const resourceRoot = vscode.Uri.file(
    path.join(context.extensionPath, 'html')
  );

  function panelInit(): vscode.WebviewPanel {
    return vscode.window.createWebviewPanel(
      'panel',
      'Procon Tools',
      vscode.ViewColumn.Beside,
      {
        localResourceRoots: [resourceRoot],
        enableScripts: true,
      }
    );
  }

  /**
   * Procon: Start contest
   */
  const cmd1 = vscode.commands.registerCommand('procon-tools.contest', () => {
    contest.contest(conf);
  });

  /**
   * Procon: Run tests
   */
  const cmd2 = vscode.commands.registerCommand('procon-tools.test', () => {
    if (!panel) {
      panel = panelInit();
    }

    runtest.runtest(context, conf, panel);

    panel.onDidDispose(() => {
      panel = undefined;
    });
  });

  /**
   * Procon: Login
   */
  const cmd3 = vscode.commands.registerCommand('procon-tools.login', () => {
    login.login(conf);
  });

  /**
   * Procon: Submit code
   */
  const cmd4 = vscode.commands.registerCommand(
    'procon-tools.submit',
    async () => {
      submit.submit(conf);
    }
  );

  // コマンド: custom test
  const cmd5 = vscode.commands.registerCommand(
    'procon-tools.custom-test',
    async () => {
      const activeFilePath: string | undefined = getActiveFilePath(conf);
      if (!activeFilePath) {
        return;
      }
      const sourceFile: string = path.basename(activeFilePath);

      if (panel) {
        panel.dispose();
      }

      panel = panelInit();

      const customObj: SourceFileObj = {
        source: activeFilePath,
        filename: sourceFile,
      };
      webview.updateCustomTest(context, panel, customObj);

      panel.webview.onDidReceiveMessage(async (obj) => {
        const customObj: SourceFileObj = {
          source: obj.source,
          filename: obj.filename,
        };
        let execution: Execution = {
          stdin: '',
          expect: '',
          stdout: '',
          stderr: '',
          time: '',
          status: '',
        };

        const error: string | undefined = await build(
          conf.getBuildCommand(obj.source)
        );
        if (error) {
          execution.stdout = error;
        } else {
          execution = await execute(conf.command, obj.stdin);
        }

        if (!panel) {
          panel = panelInit();
        }
        webview.updateCustomTest(context, panel, customObj, execution);
      });

      panel.onDidDispose(() => {
        panel = undefined;
      });
    }
  );

  vscode.workspace.onDidChangeConfiguration(() => {
    conf.update();
  });

  context.subscriptions.push(cmd1);
  context.subscriptions.push(cmd2);
  context.subscriptions.push(cmd3);
  context.subscriptions.push(cmd4);
  context.subscriptions.push(cmd5);
}
