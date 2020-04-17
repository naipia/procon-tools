import * as vscode from 'vscode';
import * as fs from 'fs';
import * as url from 'url';
import * as cheerio from 'cheerio-httpcli';
import { exec } from 'child_process';

const ATCODER_URL = 'https://atcoder.jp';

function mkdir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  }
}

function createSource(
  taskDir: string,
  task: string,
  extension: string
): Promise<void> {
  return new Promise((resolve) => {
    const filename: string = taskDir + '/' + task + '.' + extension;
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
  proconRoot: string,
  contestUrlParse: url.UrlWithStringQuery,
  extension: string
): string | null {
  mkdir(proconRoot);

  const contestRoot: string = proconRoot + 'atcoder';
  mkdir(contestRoot);

  const contestPathname: string | null = contestUrlParse.pathname;
  if (!contestPathname) {
    return null;
  }

  const contestName = contestPathname.split('/')[2];
  if (contestName === undefined) {
    return null;
  }

  const contestDir: string = contestRoot + '/' + contestName + '/';
  mkdir(contestDir);

  const leaf: string | undefined = contestPathname.split('/').pop();
  if (leaf === undefined) {
    return null;
  }

  const task: RegExpMatchArray | null = leaf.match(/(.+)_(.+)/);
  const taskListUrl: string =
    ATCODER_URL + '/contests/' + contestName + '/tasks';
  const contestUrl: string = taskListUrl + '/' + contestName + '_';
  if (!task || task[1] !== contestName) {
    cheerio.fetch(taskListUrl, {}).then(async (result) => {
      const elements = result.$('tbody').find('td').find('a');
      for (let i = 0; i < elements.length; i++) {
        const alphabet = result.$(elements[i]).text();
        if (alphabet.match(/^[A-Z]{1}[1-9]*$/)) {
          const filename = alphabet.toString().toLowerCase();
          const taskUrl: string = contestUrl + filename;
          const taskDir: string = contestDir + filename;
          mkdir(taskDir);
          mkdir(taskDir + '/testcases');
          getTestcases(taskUrl, taskDir);
          await createSource(taskDir, contestName + '_' + filename, extension);
        }
      }
    });

    return contestName;
  } else {
    const taskUrl: string = contestUrl + task[2];
    const taskDir: string = contestDir + task[2];
    mkdir(taskDir);
    mkdir(taskDir + '/testcases');
    createSource(taskDir, contestName + '_' + task[2], extension);
    getTestcases(taskUrl, taskDir);

    return contestName + ' ' + task[2];
  }
}

export function login(username: string, password: string): void {
  cheerio.fetch('https://atcoder.jp/login', {}).then((result) => {
    const csrfToken: string | undefined = result
      .$('form')
      .find('input')
      .attr('value');
    if (csrfToken === undefined) {
      return;
    }

    const loginInfo = {
      csrf_token: csrfToken,
      username: username,
      password: password,
    };

    result
      .$('form[class=form-horizontal]')
      .submit(loginInfo)
      .then((result) => {
        const title: string = result.$('title').text();
        if (title === 'Sign In - AtCoder') {
          vscode.window.showInformationMessage('Failed to login.');
        } else {
          vscode.window.showInformationMessage('Login successful.');
        }
      });
  });
}
