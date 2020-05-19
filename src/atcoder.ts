import * as vscode from 'vscode';
import * as fs from 'fs';
import * as url from 'url';
import * as path from 'path';
import * as cheerio from 'cheerio-httpcli';
import { exec } from 'child_process';
import { Configuration } from './configuration';
import { LoginInfo } from './login';

const ATCODER_URL = 'https://atcoder.jp';

interface SubmitInfo {
  submitUrl: string;
  taskName: string;
}

function saveSubmitInfo(
  dir: string,
  submitUrl: string,
  taskName: string
): void {
  const submitInfo: SubmitInfo = {
    submitUrl: submitUrl,
    taskName: taskName,
  };
  fs.writeFileSync(dir + '/.submit', JSON.stringify(submitInfo, null));
}

function getSubmitInfo(activeFilePath: string): SubmitInfo {
  const submitInfoPath: string = path.dirname(activeFilePath) + '/.submit';
  const submitInfo: SubmitInfo = fs.existsSync(submitInfoPath)
    ? JSON.parse(fs.readFileSync(submitInfoPath, 'utf8').toString())
    : {};
  return submitInfo;
}

function mkdir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  }
}

function createSource(filename: string): Promise<void> {
  return new Promise((resolve) => {
    if (!fs.existsSync(filename)) {
      fs.writeFileSync(filename, '');
    }
    exec('code ' + filename, () => {
      resolve();
    });
  });
}

function getTestcases(taskUrl: string, taskDir: string): void {
  cheerio.fetch(taskUrl, {}).then((result) => {
    console.log(result.$('title').text());
    let num = 1;
    result.$('section').each((i, elem) => {
      const text1 = result.$(elem).find('h3').text();
      const text2 = result.$(elem).find('pre').text();
      if (text1.includes('入力例')) {
        const filename: string =
          taskDir + '/testcases/' + Math.floor((num + 1) / 2) + '.in.txt';
        fs.writeFile(filename, text2, (err) => {
          if (err) {
            console.log(err);
          }
        });
        num++;
      }
      if (text1.includes('出力例')) {
        const filename: string =
          taskDir + '/testcases/' + Math.floor((num + 1) / 2) + '.out.txt';
        fs.writeFile(filename, text2, (err) => {
          if (err) {
            console.log(err);
          }
        });
        num++;
      }
    });
  });
}

export function contestInit(
  conf: Configuration,
  contestUrlParse: url.UrlWithStringQuery
): string | undefined {
  mkdir(conf.proconRoot);

  const contestRoot: string = conf.proconRoot + 'atcoder';
  mkdir(contestRoot);

  const contestPathname: string | null = contestUrlParse.pathname;
  if (!contestPathname) {
    return undefined;
  }
  const contestName = contestPathname.split('/')[2];
  const contestDir: string = contestRoot + '/' + contestName + '/';
  mkdir(contestDir);

  const leaf: string | undefined = contestPathname.split('/').pop();
  if (leaf === undefined) {
    return undefined;
  }

  const submitUrl: string = 'https://atcoder.jp/contests/%CONTEST_NAME/submit'.replace(
    '%CONTEST_NAME',
    contestName
  );

  const task: RegExpMatchArray | null = leaf.match(/(.+)_(.+)/);
  const taskListUrl: string =
    ATCODER_URL + '/contests/' + contestName + '/tasks';
  if (!task || task[1] !== contestName) {
    cheerio.fetch(taskListUrl, {}).then(async (result) => {
      const elements = result.$('tbody').find('td').find('a');
      let first = '';
      for (let i = 0; i < elements.length; i++) {
        const alphabet = result.$(elements[i]).text();
        if (alphabet.match(/^[A-Z]{1}[1-9]*$/)) {
          const contestUrl: string | undefined = result
            .$(elements[i])
            .attr('href');
          if (!contestUrl) {
            continue;
          }
          const taskName: string = contestUrl.split('/').pop() + '';
          const taskDir: string =
            contestDir + alphabet.toString().toLowerCase();
          const filename: string =
            taskDir + '/' + taskName + '.' + conf.extension;
          if (first === '') {
            first = filename;
          }
          saveSubmitInfo(taskDir, submitUrl, taskName);
          mkdir(taskDir);
          mkdir(taskDir + '/testcases');
          getTestcases(ATCODER_URL + contestUrl, taskDir);
          await createSource(filename);
        }
      }
      createSource(first);
    });

    return contestName;
  } else {
    const taskDir: string = contestDir + task[2];
    const filename: string = taskDir + '/' + leaf + '.' + conf.extension;
    saveSubmitInfo(taskDir, submitUrl, leaf);
    mkdir(taskDir);
    mkdir(taskDir + '/testcases');
    getTestcases(contestUrlParse.href, taskDir);
    createSource(filename);

    return contestName + ' ' + task[2];
  }
}

export function login(loginInfo: LoginInfo): Promise<boolean> {
  return new Promise((resolve) => {
    cheerio.fetch('https://atcoder.jp/login', {}).then((result) => {
      const csrfToken: string | undefined = result
        .$('form')
        .find('input')
        .attr('value');
      if (csrfToken === undefined) {
        return;
      }

      const submitInfo = {
        csrf_token: csrfToken,
        username: loginInfo.username,
        password: loginInfo.password,
      };

      result
        .$('form[class=form-horizontal]')
        .submit(submitInfo)
        .then((result) => {
          const title: string = result.$('title').text();
          if (title === 'Sign In - AtCoder') {
            resolve(false);
          } else {
            resolve(true);
          }
        });
    });
  });
}

export async function autologin(loginInfo: LoginInfo): Promise<boolean> {
  if (!loginInfo) {
    vscode.window.showInformationMessage(
      'There is no login information for AtCoder.'
    );
  } else {
    if (await login(loginInfo)) {
      return true;
    }
  }
  vscode.window.showInformationMessage('Failed to login.');
  return false;
}

export function submit(conf: Configuration, activeFilePath: string): void {
  const info: SubmitInfo = getSubmitInfo(activeFilePath);
  const submitUrl: string = info.submitUrl;
  if (!submitUrl) {
    vscode.window.showInformationMessage('Execute "Start contest" command');
    return;
  }

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
        'data.TaskScreenName': info.taskName,
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
          vscode.window
            .showInformationMessage(info.taskName + ' was submitted!', 'Result')
            .then(() => {
              vscode.env.openExternal(
                vscode.Uri.parse(submitUrl.replace('submit', 'submissions/me'))
              );
            });
        });
    });
  });
}
