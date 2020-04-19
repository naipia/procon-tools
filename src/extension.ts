import * as vscode from 'vscode';
import * as url from 'url';
import * as cheerio from 'cheerio-httpcli';
import * as fs from 'fs';

import { Configuration } from './configuration';
import * as atcoder from './atcoder';
import { updateResultWebview } from './webview';
import { runAllTestcases, getResult } from './run';

const REGEX_URL = /^https?:\/\//;

const conf = new Configuration();

// Identify the contest site from the URL and get ready for the contest
function contestController(inputUrl: string): void {
  const contestUrlParse: url.UrlWithStringQuery = url.parse(inputUrl);
  const contestUrlParseHost: string | null = contestUrlParse.host;
  if (!contestUrlParseHost) {
    return;
  }

  if (contestUrlParseHost.match(/atcoder/)) {
    console.log('AtCoder');
    const text = atcoder.contestInit(
      conf.proconRoot,
      contestUrlParse,
      conf.extension
    );
    if (!text) {
      console.log('Failed to initialize.');
      return;
    }
    vscode.window.showInformationMessage('AtCoder: ' + text);
  } else {
    const message: string =
      'This extension dose not support this site: "' +
      contestUrlParse.host?.toString() +
      '"';
    vscode.window.showInformationMessage(message);
    return;
  }
}

// Submit to the selected site
function submitAtcoder(
  activeFilePath: string,
  submitUrl: string,
  taskName: string
): void {
  fs.readFile(activeFilePath, 'utf8', (err, data) => {
    if (err) {
      console.log(err);
    }
    cheerio.fetch(submitUrl, {}).then((result) => {
      const csrfToken: string | undefined = result
        .$('form')
        .find('input')
        .attr('value');
      if (csrfToken === undefined) {
        return;
      }

      const option: string = 'option[data-mime="%DATAMIME"]'.replace(
        '%DATAMIME',
        conf.atdocerID
      );

      const languageID: string | undefined = result
        .$('div[id=select-lang]')
        .find('select')
        .find(option)
        .attr('value');
      if (languageID === undefined) {
        return;
      }

      const submitInfo = {
        csrf_token: csrfToken,
        'data.TaskScreenName': taskName,
        'data.LanguageId': languageID,
        sourceCode: data,
      };

      result
        .$('form[class="form-horizontal form-code-submit"]')
        .submit(submitInfo)
        .then((res) => {
          if (res.error) {
            console.error(res.error);
          }
          vscode.window.showInformationMessage(taskName + ' was submitted!');
        });
    });
  });
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
        if (inputUrl === undefined) {
          return;
        }
        contestController(inputUrl);
      });
  });

  // Run testcases and display their results
  const cmd2 = vscode.commands.registerCommand(
    'procon-tools.test',
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        return;
      }

      const activeFilePath: string = editor.document.fileName;
      if (activeFilePath.split('.').pop() !== conf.extension) {
        return;
      }

      const sourceFile: string | undefined = activeFilePath.split('/').pop();
      if (sourceFile === undefined) {
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
        console.log(contestName);
        atcoder.login(username, password);
      }
    });
  });

  // Submit a code
  const cmd4 = vscode.commands.registerCommand('procon-tools.submit', () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      return;
    }

    const activeFilePath: string = editor.document.fileName;
    if (activeFilePath.split('.').pop() !== conf.extension) {
      return;
    }

    const fileName: string | undefined = activeFilePath.split('/').pop();
    if (!fileName) {
      return;
    }

    const taskName: string | undefined = fileName.split('.')[0];
    if (!taskName) {
      return;
    }

    const contestName: string = taskName.split('_')[0];
    if (activeFilePath.match(/atcoder/)) {
      const atcoderSubmitUrl: string = 'https://atcoder.jp/contests/%CONTEST_NAME/submit'.replace(
        '%CONTEST_NAME',
        contestName
      );
      submitAtcoder(activeFilePath, atcoderSubmitUrl, taskName);
    }
  });

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
