import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

function getMainHTML(
  context: vscode.ExtensionContext,
  panel: vscode.WebviewPanel
): Promise<string> {
  return new Promise((resolve) => {
    const filename = context.extensionPath + '/html/result.html';
    fs.readFile(filename, 'utf8', (err, data) => {
      if (err) {
        console.error(err);
      }
      const cssPath = panel.webview.asWebviewUri(
        vscode.Uri.file(path.join(context.extensionPath, 'html', 'main.css'))
      );
      resolve(data.replace('main.css', cssPath.toString()));
    });
  });
}

function getCustomTestHTML(
  context: vscode.ExtensionContext,
  panel: vscode.WebviewPanel
): Promise<string> {
  return new Promise((resolve) => {
    fs.readFile(
      context.extensionPath + '/html/custom_test.html',
      'utf8',
      (err, data) => {
        if (err) {
          console.error(err);
          resolve('');
          return;
        }
        const cssPath = panel.webview.asWebviewUri(
          vscode.Uri.file(path.join(context.extensionPath, 'html/main.css'))
        );
        resolve(data.replace('main.css', cssPath.toString()));
      }
    );
  });
}

function getCaseHTML(context: vscode.ExtensionContext): Promise<string> {
  return new Promise((resolve) => {
    const filename: string = context.extensionPath + '/html/case.html';
    fs.readFile(filename, 'utf8', (err, data) => {
      if (err) {
        console.error(err);
      }
      resolve(data);
    });
  });
}

function getCompilationErrorHTML(
  context: vscode.ExtensionContext
): Promise<string> {
  return new Promise((resolve) => {
    const filename: string =
      context.extensionPath + '/html/compilation_error.html';
    fs.readFile(filename, 'utf8', (err, data) => {
      if (err) {
        console.error(err);
      }
      resolve(data);
    });
  });
}

export async function updateResults(
  context: vscode.ExtensionContext,
  panel: vscode.WebviewPanel,
  sourceFile: string,
  results: Execution[]
): Promise<void> {
  const mainDoc: string = await getMainHTML(context, panel);
  const caseDoc: string = await getCaseHTML(context);
  let cases = '';
  for (let i = 0; i < results.length; i++) {
    cases += caseDoc
      .replace('%INPUT%', results[i].stdin)
      .replace('%EXPECT%', results[i].expect)
      .replace('%RESULT%', results[i].stdout)
      .replace('%STDERR%', results[i].stderr)
      .replace(/%EXECTIME%/, results[i].time)
      .replace(/%STATUS%/g, results[i].status)
      .replace(/%IID%/g, 'input' + String(i));
  }
  panel.webview.html = mainDoc
    .replace(
      '%TITLE%',
      sourceFile.split('.')[0].replace('_', ' ').toUpperCase()
    )
    .replace('%CASE%', cases);
}

export async function updateCompilationError(
  context: vscode.ExtensionContext,
  panel: vscode.WebviewPanel,
  sourceFile: string,
  error: string
): Promise<void> {
  const mainDoc: string = await getMainHTML(context, panel);
  const errDoc: string = await getCompilationErrorHTML(context);
  panel.webview.html = mainDoc
    .replace(
      '%TITLE%',
      sourceFile.split('.')[0].replace('_', ' ').toUpperCase()
    )
    .replace('%CASE%', errDoc.replace('%MESSAGE%', error));
}

export async function updateCustomTest(
  context: vscode.ExtensionContext,
  panel: vscode.WebviewPanel,
  obj: SourceFileObj,
  execution: Execution = {
    stdin: '',
    expect: '',
    stdout: '',
    stderr: '',
    time: '',
    status: '',
  }
): Promise<void> {
  const data = await getCustomTestHTML(context, panel);
  panel.webview.html = data
    .replace('%SOURCE_PATH%', obj.source)
    .replace(/%FILENAME%/g, obj.filename)
    .replace('%STDIN%', execution.stdin)
    .replace('%STDOUT%', execution.stdout)
    .replace('%STDERR%', execution.stderr)
    .replace('%EXECTIME%', execution.time);
}
