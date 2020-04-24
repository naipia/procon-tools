import * as vscode from 'vscode';
import * as languages from './languages';

export class Configuration {
  conf!: vscode.WorkspaceConfiguration;
  homeDir!: string;
  proconRoot!: string;
  language!: string;
  extension!: string;
  command!: string;
  confirmation!: boolean;
  atdocerID!: string;

  constructor() {
    this.homeDir = process.env.HOME ? process.env.HOME : '';
    this.update();
  }

  public update(): void {
    this.conf = vscode.workspace.getConfiguration('procon-tools');
    let proconPath = '~/contests';
    if (this.conf.has('home')) {
      proconPath = this.conf.get('home', proconPath);
    } else {
      this.conf.update('home', '~/contests');
    }
    this.proconRoot = proconPath + '/';
    this.proconRoot = this.proconRoot.replace('//', '/');
    this.proconRoot = this.proconRoot.replace(/^~/, this.homeDir);

    this.language = this.conf.get('language', 'C++');
    const selectedLanguage = languages.getLanguage(this.language);
    this.extension = selectedLanguage.extension;
    this.command = selectedLanguage.command;
    this.atdocerID = selectedLanguage.atdocerID;
    this.confirmation = this.conf.get('pre-submission', true);
  }
}
