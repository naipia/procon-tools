import * as vscode from 'vscode';
import * as fs from 'fs';
import { exec } from 'child_process';

async function timeout(): Promise<string> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve('Timeout');
    }, 3000);
  });
}

function verify(resFilePath: string, outFilePath: string): Promise<string> {
  return new Promise((resolve) => {
    exec(
      'diff -qBb --strip-trailing-cr ' + resFilePath + ' ' + outFilePath,
      (err, stdout) => {
        if (stdout !== '') {
          resolve('WA');
        } else {
          resolve('AC');
        }
      }
    );
  });
}

function readfile(filePath: string): Promise<string> {
  return new Promise((resolve) => {
    fs.readFile(filePath, 'utf8', (err, data) => {
      if (err) {
        console.error(err);
      }
      resolve(data.trim());
    });
  });
}

export function getResult(testcasesDir: string): Promise<string[][]> {
  return new Promise((resolve) => {
    fs.readdir(testcasesDir, async (err, files) => {
      const resFiles: string[] = files.filter((file) => {
        return /.*\.res.txt$/.test(file);
      });
      const results: string[][] = [];
      for (let i = 0; i < resFiles.length; i++) {
        const resFilePath: string = testcasesDir + resFiles[i];
        const inFilePath: string = resFilePath.replace(/.res./, '.in.');
        const outFilePath: string = resFilePath.replace(/.res./, '.out.');
        const result = verify(resFilePath, outFilePath);
        const input = readfile(inFilePath);
        const expectOutput = readfile(outFilePath);
        const resultOutput = readfile(resFilePath);

        await Promise.all([input, expectOutput, resultOutput, result]).then(
          (arr) => {
            results.push(arr);
          }
        );
      }
      resolve(results);
    });
  });
}

function runTestcase(
  baseCommand: string,
  input: string,
  output: string
): Promise<string> {
  return new Promise((resolve) => {
    exec(baseCommand.replace('%IN', input).replace('%OUT', output), (err) => {
      console.log(baseCommand.replace('%IN', input).replace('%OUT', output));
      if (err) {
        console.error(err);
        resolve('Runtime Error');
      }
      resolve('OK');
    });
  });
}

export function runAllTestcases(
  testcasesDir: string,
  baseCommand: string
): Promise<void> {
  return new Promise((resolve) => {
    fs.readdir(testcasesDir, async (err, files) => {
      if (err) {
        console.error(err);
      }
      const inFiles: string[] = files.filter((file) => {
        return /.*\.in.txt$/.test(file);
      });
      for (let i = 0; i < inFiles.length; i++) {
        const file = inFiles[i];
        const input: string = testcasesDir + file;
        const output: string = testcasesDir + file.split('.')[0] + '.res.txt';
        const message = await Promise.race([
          timeout(),
          runTestcase(baseCommand, input, output),
        ]);
        if (message !== 'OK') {
          vscode.window.showInformationMessage(message);
        }
      }
      resolve();
    });
  });
}
