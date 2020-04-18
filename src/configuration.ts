import * as vscode from 'vscode';

import { languages } from './languages';

export class Configuration {
  conf!: vscode.WorkspaceConfiguration;
  home: string;
  proconRoot!: string;
  language!: string;
  extension!: string;
  command!: string;

  constructor() {
    const home: string | undefined = process.env.HOME;
    if (home !== undefined) {
      this.home = home;
    } else {
      this.home = '';
    }
    this.update();
  }

  public update(): void {
    this.conf = vscode.workspace.getConfiguration('procon-tools');
    let proconPath: string | undefined = this.conf.get('home');
    if (proconPath === undefined || proconPath === '') {
      this.conf.update('home', '~/contests');
      proconPath = '~/contests';
    }

    this.proconRoot = proconPath + '/';
    this.proconRoot = this.proconRoot.replace('//', '/');
    this.proconRoot = this.proconRoot.replace(/^~/, this.home);

    let lang: string | undefined = this.conf.get('language');
    if (lang === undefined) {
      lang = 'Go';
    }
    this.language = lang;
    this.extension = languages[this.language].extension;
    this.command = languages[this.language].command;
  }
}
