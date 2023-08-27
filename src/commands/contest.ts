import * as vscode from 'vscode';
import * as url from 'url';

import { Configuration } from '../configuration';
import * as atcoder from '../contest/atcoder';

/**
 * サイトを判別し問題の準備を行う
 * @param conf Configuration
 * @param inputUrl コンテストサイトの問題URL
 */
async function siteController(
  conf: Configuration,
  inputUrl: string
): Promise<void> {
  const contestUrlParse = url.parse(inputUrl);
  const contestUrlParseHost = contestUrlParse.host;
  if (!contestUrlParseHost) {
    vscode.window.showErrorMessage('Unknown hostname');
    return;
  }

  let message: string;
  if (contestUrlParseHost.match(/atcoder/)) {
    if (!(await atcoder.autologin(conf, inputUrl))) {
      return;
    }

    const text = await atcoder.contestInit(conf, contestUrlParse);
    if (!text) {
      vscode.window.showErrorMessage('Failed to initialize.');
      return;
    }
    message = 'AtCoder: ' + text;
  } else {
    message =
      'This extension dose not support this site: "' +
      contestUrlParse.host?.toString() +
      '"';
  }
  vscode.window.showInformationMessage(message);
}

/**
 * Procon: Start contest
 */
export function contest(conf: Configuration): void {
  vscode.window
    .showInputBox({
      ignoreFocusOut: true,
      prompt: 'Get ready?',
      placeHolder: 'Contest URL',
      validateInput: (param) => {
        return /^https?:\/\//.test(param) ? '' : 'Please enter the URL';
      },
    })
    .then((inputUrl) => {
      if (!inputUrl) {
        return;
      }
      siteController(conf, inputUrl);
    });
}
