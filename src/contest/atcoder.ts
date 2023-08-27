import * as vscode from 'vscode';
import { promises as fs } from 'fs';
import * as url from 'url';
import * as cheerio from 'cheerio-httpcli';

import { Configuration } from '../configuration';
import {
  getLoginInfo,
  getSubmitInfo,
  saveSubmitInfo,
  code,
  createSource,
} from '../util';

const ATCODER_URL = 'https://atcoder.jp';
const SUBMIT_URL = 'https://atcoder.jp/contests/%CONTEST_NAME%/submit';
const LOGIN_URL = 'https://atcoder.jp/login';

async function getTestcases(taskUrl: string, taskDir: string): Promise<void> {
  const testcasesDir = taskDir + '/testcases/';
  await fs.mkdir(testcasesDir, { recursive: true });

  cheerio.fetch(taskUrl, {}).then((result) => {
    let num = 1;
    result.$('section').each((i, elem) => {
      const text1 = result.$(elem).find('h3').text();
      const text2 = result.$(elem).find('pre').slice(0).eq(0).text();
      if (text1.includes('入力例')) {
        const filename = testcasesDir + num.toString() + '.in.txt';
        fs.writeFile(filename, text2).catch((e) => {
          if (e) {
            vscode.window.showErrorMessage(e);
          }
        });
      }
      if (text1.includes('出力例')) {
        const filename = testcasesDir + num.toString() + '.out.txt';
        fs.writeFile(filename, text2).catch((e) => {
          if (e) {
            vscode.window.showErrorMessage(e);
          }
        });
        num++;
      }
    });
  });
}

export async function contestInit(
  conf: Configuration,
  contestUrlParse: url.UrlWithStringQuery
): Promise<string | undefined> {
  const contestRoot: string = conf.proconRoot + 'atcoder';

  const contestPathname: string | null = contestUrlParse.pathname;
  if (!contestPathname) {
    vscode.window.showErrorMessage('');
    return;
  }
  const contestUrlInfo: string[] = contestPathname.split('/');
  if (contestUrlInfo.slice(-1)[0] === '') {
    contestUrlInfo.pop();
  }
  if (
    contestUrlInfo.length < 3 ||
    contestUrlInfo.length > 5 ||
    (contestUrlInfo.length >= 4 && contestUrlInfo[3] !== 'tasks') ||
    contestUrlInfo[1] !== 'contests'
  ) {
    return;
  }

  const contestName = contestUrlInfo[2];
  const contestDir: string = contestRoot + '/' + contestName + '/';

  await fs.mkdir(contestDir, { recursive: true });

  const leaf: string =
    contestUrlInfo.length === 5 ? contestUrlInfo.slice(-1)[0] : '';
  const submitUrl: string = SUBMIT_URL.replace('%CONTEST_NAME%', contestName);

  const taskListUrl: string =
    ATCODER_URL + '/contests/' + contestName + '/tasks';
  const result = cheerio.fetchSync(taskListUrl, {});

  const elements = result.$('tbody').find('tr');
  const files: string[] = [];
  for (let i = 0; i < elements.length; i++) {
    const task = result.$(elements[i]).find('a').first();
    const alphabet = task.text().toLowerCase();
    const contestUrl: string | undefined = task.attr('href');
    if (!contestUrl) {
      continue;
    }

    const taskName: string = contestUrl.split('/').pop() + '';
    if (leaf !== '' && taskName !== leaf) {
      continue;
    }
    const taskDir: string = contestDir + alphabet;
    const filename: string =
      taskDir + '/' + contestName + '_' + alphabet + '.' + conf.extension;

    files.push(filename);

    createSource(files[i], conf.template);
    getTestcases(ATCODER_URL + contestUrl, taskDir);
    saveSubmitInfo(taskDir, submitUrl, taskName);
  }

  for (let i = 0; i < files.length; i++) {
    await code(files[i]);
  }
  for (let i = files.length - 1; i >= 0; i--) {
    await code(files[i]);
  }

  return contestName;
}

export async function login(loginInfo: LoginInfo): Promise<boolean> {
  const result = cheerio.fetchSync(LOGIN_URL, {});

  const csrfToken: string | undefined = result
    .$('form')
    .find('input')
    .attr('value');
  if (!csrfToken) {
    vscode.window.showErrorMessage('CSRF token was not found.');
    return false;
  }

  const submitInfo = {
    csrf_token: csrfToken,
    username: loginInfo.username,
    password: loginInfo.password,
  };

  const submitResult = await result
    .$('form[class=form-horizontal]')
    .submit(submitInfo);

  const title: string = submitResult.$('title').text();
  if (title === 'Sign In - AtCoder') {
    return false;
  }

  return true;
}

/**
 * ログインの要否を返す
 * @param url ログイン状態を確認するページURL
 * @returns ログインが必要であればtrue、不要であればfalseを返す
 */
function isLoginRequired(url: string): boolean {
  const result = cheerio.fetchSync(url, {});
  const resultUrl = result.$.documentInfo().url;
  if (result.response.statusCode === 200 && url === resultUrl) {
    return false;
  }

  return true;
}

/**
 * ログインが必要な場合ログインを行い、成否を返す
 * @param conf Configuration
 * @param url ログイン状態を確認するページURL
 * @returns ログイン済みまたは成功した場合true、失敗した場合はfalseを返す
 */
export async function autologin(
  conf: Configuration,
  url: string
): Promise<boolean> {
  if (!isLoginRequired(url)) {
    return true;
  }

  const loginInfo = await getLoginInfo('AtCoder', conf.homeDir);
  if (!loginInfo || !loginInfo.username || !loginInfo.password) {
    vscode.window.showErrorMessage(
      'There is no login information for AtCoder.'
    );
    return false;
  }

  if (!(await login(loginInfo))) {
    vscode.window.showErrorMessage('Failed to login.');
    return false;
  }

  return true;
}

export async function submit(
  conf: Configuration,
  activeFilePath: string
): Promise<void> {
  const submitInfo = await getSubmitInfo(activeFilePath);
  const submitUrl = submitInfo.submitUrl;
  if (!submitUrl) {
    vscode.window.showInformationMessage('Execute "Start contest" command');
    return;
  }

  if (!(await autologin(conf, submitUrl))) {
    return;
  }

  fs.readFile(activeFilePath, 'utf8')
    .then((data) => {
      cheerio.fetch(submitUrl, {}).then((result) => {
        const csrfToken: string | undefined = result
          .$('form')
          .find('input')
          .attr('value');
        if (!csrfToken) {
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
        if (!languageID) {
          return;
        }

        const submit = {
          csrf_token: csrfToken,
          'data.TaskScreenName': submitInfo.taskName,
          'data.LanguageId': languageID,
          sourceCode: data,
        };

        result
          .$('form[class="form-horizontal form-code-submit"]')
          .submit(submit)
          .then((res) => {
            if (res.error) {
              console.error(res.error);
            }
            vscode.window
              .showInformationMessage(
                submitInfo.taskName + ' was submitted!',
                'Result'
              )
              .then(() => {
                vscode.env.openExternal(
                  vscode.Uri.parse(
                    submitUrl.replace('submit', 'submissions/me')
                  )
                );
              });
          });
      });
    })
    .catch((err) => {
      vscode.window.showErrorMessage(err);
    });
}
