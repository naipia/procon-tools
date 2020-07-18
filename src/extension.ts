import * as vscode from 'vscode';
import * as url from 'url';
import * as path from 'path';
import { Configuration } from './configuration';
import * as atcoder from './atcoder';
import * as webview from './webview';
import { runAllTestcases, build, execute } from './run';
import { LoginInfo, saveLoginInfo, getLoginInfo } from './login';

const conf = new Configuration();
export let atcoderLogin = false;

async function contestController(inputUrl: string): Promise<void> {
  const contestUrlParse: url.UrlWithStringQuery = url.parse(inputUrl);
  const contestUrlParseHost: string | null = contestUrlParse.host;
  if (!contestUrlParseHost) {
    return;
  }

  let message: string;
  if (contestUrlParseHost.match(/atcoder/)) {
    if (!atcoderLogin) {
      const loginInfo: LoginInfo = getLoginInfo('AtCoder', conf.homeDir);
      atcoderLogin = await atcoder.autologin(loginInfo);
    }
    const text = atcoder.contestInit(conf, contestUrlParse);
    if (!text) {
      message = 'Failed to initialize.';
    } else {
      message = 'AtCoder: ' + text;
    }
  } else {
    message =
      'This extension dose not support this site: "' +
      contestUrlParse.host?.toString() +
      '"';
  }
  vscode.window.showInformationMessage(message);
}

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

export function activate(context: vscode.ExtensionContext): void {
  let panel: vscode.WebviewPanel;
  let isPanelAlive = false;

  // Contest initialization
  const cmd1 = vscode.commands.registerCommand('procon-tools.contest', () => {
    vscode.window
      .showInputBox({
        prompt: 'Get ready for a contest.',
        placeHolder: 'Enter a contest URL',
        validateInput: (param) => {
          return /^https?:\/\//.test(param) ? '' : 'Please enter the URL';
        },
      })
      .then((inputUrl) => {
        if (!inputUrl) {
          return;
        }
        contestController(inputUrl);
      });
  });

  // Run testcases and display their results
  const cmd2 = vscode.commands.registerCommand(
    'procon-tools.test',
    async () => {
      const activeFilePath: string | undefined = getActiveFilePath(conf);
      if (!activeFilePath) {
        return;
      }
      const sourceFile: string = path.basename(activeFilePath);
      const taskDir: string = path.dirname(activeFilePath) + '/';
      const testcasesDir: string = taskDir + 'testcases/';
      const buildCommand: string = conf.build.replace('%S', activeFilePath);

      if (!isPanelAlive) {
        panel = vscode.window.createWebviewPanel(
          'panel',
          'Procon-tools',
          vscode.ViewColumn.Beside,
          {
            enableScripts: true,
          }
        );
        isPanelAlive = true;
      }

      const error: string | null = await build(buildCommand);
      if (error) {
        webview.updateCompilationError(context, panel, sourceFile, error);
        vscode.window.showInformationMessage('Compilation Error');
        return;
      }

      const executions: Execution[] = await runAllTestcases(
        testcasesDir,
        conf.command
      );

      webview.updateResults(context, panel, sourceFile, executions);
      vscode.window.showInformationMessage('All tests have been completed!');

      panel.onDidDispose(() => {
        isPanelAlive = false;
      });
    }
  );

  // Login to a selected contest website
  const cmd3 = vscode.commands.registerCommand('procon-tools.login', () => {
    vscode.window.showQuickPick(['AtCoder']).then(async (contestName) => {
      const username: string | undefined = await vscode.window.showInputBox({
        prompt: 'Username',
        placeHolder: 'username',
      });
      if (!username) {
        return;
      }

      const password: string | undefined = await vscode.window.showInputBox({
        prompt: 'password',
        placeHolder: 'password',
      });
      if (!password) {
        return;
      }

      if (contestName === 'AtCoder') {
        const loginInfo = {
          username: username,
          password: password,
        };
        atcoderLogin = await atcoder.login(loginInfo);
        if (atcoderLogin) {
          vscode.window.showInformationMessage('Login successful.');
          saveLoginInfo(contestName, conf.homeDir, username, password);
        } else {
          vscode.window.showInformationMessage('Failed to login.');
        }
      }
    });
  });

  // Submit a code
  const cmd4 = vscode.commands.registerCommand(
    'procon-tools.submit',
    async () => {
      const activeFilePath: string | undefined = getActiveFilePath(conf);
      if (!activeFilePath) {
        return;
      }

      if (conf.confirmation) {
        const submit: string | undefined = await vscode.window.showQuickPick(
          ['Yes', 'No'],
          {
            placeHolder: 'Submit ' + path.basename(activeFilePath),
          }
        );
        if (!submit || submit === 'No') {
          return;
        }
      }

      const contest: string = activeFilePath.replace(conf.proconRoot, '');
      if (contest.match(/atcoder/)) {
        if (!atcoderLogin) {
          const loginInfo: LoginInfo = getLoginInfo('AtCoder', conf.homeDir);
          atcoderLogin = await atcoder.autologin(loginInfo);
          if (!atcoderLogin) {
            return;
          }
        }
        atcoder.submit(conf, activeFilePath);
      }
    }
  );

  const cmd5 = vscode.commands.registerCommand(
    'procon-tools.custom-test',
    async () => {
      const activeFilePath: string | undefined = getActiveFilePath(conf);
      if (!activeFilePath) {
        return;
      }
      const sourceFile: string = path.basename(activeFilePath);

      if (isPanelAlive) {
        panel.dispose();
      }
      isPanelAlive = true;
      panel = vscode.window.createWebviewPanel(
        'panel',
        'Procon-tools',
        vscode.ViewColumn.Beside,
        {
          enableScripts: true,
        }
      );

      const data: string = await conf.getCustomTestHTML(context);
      const customObj: SourceFileObj = {
        source: activeFilePath,
        filename: sourceFile,
      };
      webview.updateCustomTest(panel, data, customObj);

      panel.onDidDispose(() => {
        isPanelAlive = false;
      });

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
        const data: string = await conf.getCustomTestHTML(context);
        const error: string | null = await build(
          conf.getBuildCommand(obj.source)
        );
        if (error) {
          execution.stderr = error;
          webview.updateCustomTest(panel, data, customObj, execution);
          return;
        }
        execution = await execute(conf.command, obj.stdin);
        webview.updateCustomTest(panel, data, customObj, execution);
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

export function deactivate(): void {
  return;
}
