import * as vscode from 'vscode';
import * as os from 'os';
import * as fs from 'fs';
import * as languages from './languages';

export class Configuration {
  conf!: vscode.WorkspaceConfiguration;
  homeDir!: string;
  proconRoot!: string;
  language!: string;
  extension!: string;
  build!: string;
  command!: string;
  confirmation!: boolean;
  template!: string;
  atdocerID!: string;

  constructor() {
    if (process.platform === 'win32') {
      this.homeDir = process.env.USERPROFILE ? process.env.USERPROFILE : '';
    } else {
      this.homeDir = process.env.HOME ? process.env.HOME : '';
    }
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
    this.build = selectedLanguage.build.replace(/%TMP/, os.tmpdir());
    this.command = selectedLanguage.command.replace(/%TMP/, os.tmpdir());
    this.atdocerID = selectedLanguage.atdocerID;
    this.confirmation = this.conf.get('pre-submission', true);
    this.getTemplate(this.conf.get('template', ''));
  }

  getTemplate(templateFilePath: string): void {
    templateFilePath = templateFilePath.replace(/^~/, this.homeDir);
    this.template = fs.existsSync(templateFilePath)
      ? fs.readFileSync(templateFilePath, 'utf8').toString()
      : '';
  }
}
