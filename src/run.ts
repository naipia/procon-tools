import * as vscode from 'vscode';
import * as fs from 'fs';
import { exec } from 'child_process';
import * as kill from 'tree-kill';
import { performance } from 'perf_hooks';

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

function readFile(filePath: string): Promise<string> {
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
        const stdin = readFile(inFilePath);
        const expectOut = readFile(outFilePath);
        const resultOut = readFile(resFilePath);

        await Promise.all([stdin, expectOut, resultOut, result]).then((arr) => {
          results.push(arr);
          fs.unlinkSync(resFilePath);
        });
      }
      resolve(results);
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
      kill(process.pid);
      resolve(['', '', 'Timeout']);
    }, 3000);
  });
}

export function runAllTestcases(
  testcasesDir: string,
  command: string
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
        const fileNum = inFiles[i].split('.')[0];
        const stdin: string = await readFile(testcasesDir + inFiles[i]);
        const out: string[] = await execute(command, stdin);
        fs.writeFileSync(testcasesDir + fileNum + '.res.txt', out[0]);
      }
      resolve();
    });
  });
}
