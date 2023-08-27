import * as vscode from 'vscode';
import { promises as fs } from 'fs';
import * as path from 'path';
import { ChildProcess, exec } from 'child_process';
import { promisify } from 'util';

import { Configuration } from './configuration';

/**
 * VSCodeで現在アクティブなファイルのパスを返す
 * @param conf VSCodeの設定情報
 * @returns ファイルパスのstring
 */
export function getActiveFilePath(conf: Configuration): string | undefined {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showErrorMessage('No active editor was found.');
    return;
  }
  const activeFilePath: string = editor.document.fileName;
  if (activeFilePath.split('.').pop() !== conf.extension) {
    vscode.window.showErrorMessage(
      'The file extension is not "' + conf.extension + '"'
    );
    return;
  }
  return activeFilePath;
}

/**
 * コンテストサイトのログイン情報を返す
 * @param contestSiteName コンテストサイト名
 * @param homeDir ホームディレクトリのパス
 * @returns コンテストサイトのLoginInfo
 */
export async function getLoginInfo(
  contestSiteName: string,
  homeDir: string
): Promise<LoginInfo | undefined> {
  const loginInfoPath: string = path.join(homeDir, '.procon-tools');
  const loginInfo: { [key: string]: LoginInfo } = await fs
    .readFile(loginInfoPath, 'utf8')
    .then((info) => {
      return JSON.parse(info.toString());
    })
    .catch(() => {
      return {};
    });

  return loginInfo[contestSiteName];
}

/**
 * 問題情報を保存する
 * @param dir 問題情報の保存先
 * @param submitUrl 提出先URL
 * @param taskName 問題名
 */
export function saveSubmitInfo(
  dir: string,
  submitUrl: string,
  taskName: string
): void {
  const submitInfo: SubmitInfo = {
    submitUrl: submitUrl,
    taskName: taskName,
  };
  const submitInfoPath = path.join(dir, '.submit');
  fs.writeFile(submitInfoPath, JSON.stringify(submitInfo, null)).catch(
    (err) => {
      vscode.window.showErrorMessage(err);
    }
  );
}

/**
 * 問題情報を取得する
 * @param activeFilePath 問題情報を取得するパス
 * @returns 問題情報
 */
export async function getSubmitInfo(
  activeFilePath: string
): Promise<SubmitInfo> {
  const submitInfoPath = path.join(path.dirname(activeFilePath), '.submit');
  const submitInfo: SubmitInfo = await fs
    .readFile(submitInfoPath, 'utf8')
    .then((data) => {
      return JSON.parse(data);
    })
    .catch(() => {
      return {};
    });
  return submitInfo;
}

/**
 * ソースファイルの作成
 * @param filepath ソースファイルのパス
 * @param data テンプレート
 */
export async function createSource(
  filepath: string,
  data: string
): Promise<void> {
  fs.access(filepath).catch(() => {
    fs.writeFile(filepath, data);
  });
}

/**
 * codeコマンドで対象のファイルを開く
 * @param filepath codeコマンドを実行するファイルパス
 */
export async function code(filepath: string): Promise<void> {
  promisify(exec)('code ' + filepath).catch((err: ChildProcess) => {
    if (err.stderr) {
      vscode.window.showErrorMessage(err.stderr?.toString());
    }
  });
}
