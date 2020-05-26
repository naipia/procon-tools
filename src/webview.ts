import * as vscode from 'vscode';
import * as fs from 'fs';

function getMainHTML(context: vscode.ExtensionContext): Promise<string> {
  return new Promise((resolve) => {
    const filename: string = context.extensionPath + '/html/result.html';
    fs.readFile(filename, 'utf8', (err, data) => {
      if (err) {
        console.error(err);
      }
      resolve(data);
    });
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
  results: string[][]
): Promise<void> {
  const mainDoc: string = await getMainHTML(context);
  const caseDoc: string = await getCaseHTML(context);
  let cases = '';
  for (let i = 0; i < results.length; i++) {
    cases +=
      caseDoc
        .replace('%INPUT', results[i][0])
        .replace('%EXPECT', results[i][1])
        .replace('%RESULT', results[i][2])
        .replace(/%STATUS/g, results[i][3])
        .replace(/%IID/g, 'input' + String(i + 1)) + '\n';
  }
  panel.webview.html = mainDoc
    .replace('%TITLE', sourceFile.split('.')[0].replace('_', ' ').toUpperCase())
    .replace('%CASE', cases);
}

export async function updateCompilationError(
  context: vscode.ExtensionContext,
  panel: vscode.WebviewPanel,
  sourceFile: string,
  message: string
): Promise<void> {
  const mainDoc: string = await getMainHTML(context);
  const errDoc: string = await getCompilationErrorHTML(context);
  panel.webview.html = mainDoc
    .replace('%TITLE', sourceFile.split('.')[0].replace('_', ' ').toUpperCase())
    .replace('%CASE', errDoc.replace('%MESSAGE', message));
}
