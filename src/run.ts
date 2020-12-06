import * as fs from 'fs';
import * as os from 'os';
import { exec } from 'child_process';
import * as kill from 'tree-kill';
import { performance } from 'perf_hooks';

export function build(buildCommand: string): Promise<string | null> {
  return new Promise((resolve) => {
    if (buildCommand === '') {
      resolve(null);
    }
    exec(buildCommand, (err) => {
      if (err) {
        resolve(String(err));
      }
      resolve(null);
    });
  });
}

export function execute(command: string, stdin: string): Promise<Execution> {
  return new Promise((resolve) => {
    const execution: Execution = {
      stdin: stdin,
      expect: '',
      stdout: '',
      stderr: '',
      time: '',
      status: 'WJ',
    };
    const start = performance.now();
    const process = exec(command, (err, stdout, stderr) => {
      const stop = performance.now();
      execution.time = String((stop - start).toFixed(0)) + ' ms';
      execution.stdout = stdout;
      execution.stderr = stderr;
      if (err) {
        execution.stdout += String(err);
        execution.status = 'RE';
      }
      resolve(execution);
    });
    process.stdin?.write(stdin);
    process.stdin?.end();
    setTimeout(() => {
      kill(process.pid);
      resolve(execution);
    }, 3000);
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

export function runAllTestcases(
  testcasesDir: string,
  command: string
): Promise<Execution[]> {
  return new Promise((resolve) => {
    fs.readdir(testcasesDir, async (err, files) => {
      if (err) {
        console.error(err);
        resolve([]);
      }
      const executions: Execution[] = [];
      const inFiles: string[] = files.filter((file) => {
        return /.*\.in\.txt$/.test(file);
      });
      for (let i = 0; i < inFiles.length; i++) {
        const fileNum = inFiles[i].split('.')[0];
        const stdin: string = await readFile(testcasesDir + inFiles[i]);
        const execution: Execution = await execute(command, stdin);
        const resFilePath: string = os.tmpdir() + '/' + fileNum + '.res.txt';
        const outFilePath: string =
          testcasesDir + inFiles[i].replace(/\.in\./, '.out.');
        fs.writeFileSync(resFilePath, execution.stdout);
        if (execution.status === 'WJ') {
          execution.status = await verify(resFilePath, outFilePath);
        }
        execution.expect = await readFile(outFilePath);
        executions.push(execution);
      }
      resolve(executions);
    });
  });
}
