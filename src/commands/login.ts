import * as vscode from 'vscode';
import * as fs from 'fs';

import { Configuration } from '../configuration';
import * as atcoder from '../contest/atcoder';

/**
 * Procon: Login
 */
export function saveLoginInfo(
  contestName: string,
  homeDir: string,
  username: string,
  password: string
): void {
  const loginInfoPath: string = homeDir + '/.procon-tools';
  const loginInfo: { [key: string]: LoginInfo } = fs.existsSync(loginInfoPath)
    ? JSON.parse(fs.readFileSync(loginInfoPath, 'utf8').toString())
    : {};
  loginInfo[contestName] = { username: username, password: password };
  fs.writeFileSync(loginInfoPath, JSON.stringify(loginInfo, null));
}

export function login(conf: Configuration): void {
  vscode.window.showQuickPick(['AtCoder']).then(async (contestName) => {
    const username: string | undefined = await vscode.window.showInputBox({
      prompt: 'Username',
      placeHolder: 'username',
    });
    if (!username) {
      return;
    }

    const password: string | undefined = await vscode.window.showInputBox({
      password: true,
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

      const success = await atcoder.login(loginInfo);
      if (success) {
        vscode.window.showInformationMessage('Login successful.');
        saveLoginInfo(contestName, conf.homeDir, username, password);
      } else {
        vscode.window.showInformationMessage('Failed to login.');
      }
    }
  });
}
