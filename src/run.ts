import * as vscode from 'vscode';
import * as fs from 'fs';
import { exec } from 'child_process';
import * as kill from 'tree-kill';
import { performance } from 'perf_hooks';

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
            fs.unlinkSync(resFilePath);
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
): Promise<boolean> {
  return new Promise((resolve) => {
    exec(baseCommand.replace('%IN', input).replace('%OUT', output), (err) => {
      if (err) {
        vscode.window.showWarningMessage(String(err));
        resolve(false);
      }
      resolve(true);
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
        const fileNum = file.split('.')[0];
        const input: string = testcasesDir + file;
        const output: string = testcasesDir + fileNum + '.res.txt';
        const status = await Promise.race([
          timeout(),
          runTestcase(baseCommand, input, output),
        ]);
        if (!status) {
          vscode.window.showInformationMessage('Runtime Error');
        }
      }
      resolve();
    });
  });
}

export function build(buildCommand: string): Promise<string | null> {
  return new Promise((resolve) => {
    if (buildCommand === '') {
      resolve(null);
    }
    exec(buildCommand, (err) => {
      if (err) {
        vscode.window.showInformationMessage('Compilation Error');
        resolve(String(err));
      }
      resolve(null);
    });
  });
}

export function execute(command: string, stdin: string): Promise<string[]> {
  return new Promise((resolve) => {
    const start = performance.now();
    const process = exec(command, (err, stdout, stderr) => {
      const time: string =
        String((performance.now() - start).toFixed(0)) + ' ms';
      if (err) {
        resolve(['', String(err), time]);
      }
      resolve([stdout, stderr, time]);
    });
    process.stdin?.write(stdin);
    process.stdin?.end();
    setTimeout(() => {
      console.log(process);
      kill(process.pid);
      resolve(['', '', 'Timeout']);
    }, 3000);
  });
}
