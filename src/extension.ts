import * as vscode from 'vscode';
import * as url from 'url';

import { Configuration } from './configuration';
import * as atcoder from './atcoder';
import { updateResultWebview } from './webview';
import { runAllTestcases, getResult } from './run';
import { LoginInfo, saveLoginInfo, getLoginInfo } from './login';

const REGEX_URL = /^https?:\/\//;

const conf = new Configuration();
let atcoderLogin = false;

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

function getActiveFilePath(): string | undefined {
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
          return REGEX_URL.test(param) ? '' : 'Please enter the URL';
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
      const activeFilePath: string | undefined = getActiveFilePath();
      if (!activeFilePath) {
        return;
      }
      const sourceFile: string | undefined = activeFilePath.split('/').pop();
      if (!sourceFile) {
        return;
      }

      const taskDir: string = activeFilePath.replace(sourceFile, '');
      const testcasesDir: string = taskDir + 'testcases/';
      const baseCommand: string = conf.command.replace('%S', activeFilePath);
      await runAllTestcases(testcasesDir, baseCommand);
      const results: string[][] = await getResult(testcasesDir);

      if (!isPanelAlive) {
        panel = vscode.window.createWebviewPanel(
          'panel',
          'Result',
          vscode.ViewColumn.Beside,
          {}
        );
        isPanelAlive = true;
      }

      updateResultWebview(context, panel, sourceFile, results);

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
      const activeFilePath: string | undefined = getActiveFilePath();
      if (!activeFilePath) {
        return;
      }

      const fileName: string | undefined = activeFilePath.split('/').pop();
      if (!fileName) {
        return;
      }

      if (conf.confirmation) {
        const submit: string | undefined = await vscode.window.showQuickPick(
          ['Yes', 'No'],
          {
            placeHolder: 'Submit ' + fileName,
          }
        );
        if (!submit || submit === 'No') {
          return;
        }
      }

      const taskName: string | undefined = fileName.split('.')[0];
      if (!taskName) {
        return;
      }

      const contest: string = taskName.split('_')[0];
      if (activeFilePath.match(/atcoder/)) {
        if (!atcoderLogin) {
          const loginInfo: LoginInfo = getLoginInfo('AtCoder', conf.homeDir);
          if (!loginInfo) {
            vscode.window.showInformationMessage(
              'You will need to register your login information.'
            );
            return;
          }
          const status: boolean = await atcoder.login(loginInfo);
          if (!status) {
            vscode.window.showInformationMessage('Failed to login.');
            return;
          }
          atcoderLogin = true;
        }
        atcoder.submit(activeFilePath, contest, taskName, conf);
      }
    }
  );

  vscode.workspace.onDidChangeConfiguration(() => {
    conf.update();
  });

  context.subscriptions.push(cmd1);
  context.subscriptions.push(cmd2);
  context.subscriptions.push(cmd3);
  context.subscriptions.push(cmd4);
}

export function deactivate(): void {
  return;
}
