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
  atcoderSubmitIDs!: string[];

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
    if (!this.conf.has('home')) {
      this.conf.update('home', '~/contests');
    }
    const proconPath = this.conf.get('home', '~/contests') + '/';
    this.proconRoot = proconPath.replace('//', '/').replace(/^~/, this.homeDir);
    this.language = this.conf.get('language', 'C++(GCC)');
    const selectedLanguage = languages.getLanguage(this.language);
    this.extension = selectedLanguage.extension;
    const buildOptions = this.conf.get('options', '');
    this.build = selectedLanguage.build
      .replace(/%TMP/, os.tmpdir())
      .replace('%OPTIONS', buildOptions);
    this.command = selectedLanguage.command.replace(/%TMP/, os.tmpdir());
    this.atcoderSubmitIDs = [...selectedLanguage.atcoderSubmitIDs];
    this.confirmation = this.conf.get('pre-submission', true);
    this.getTemplate(this.conf.get('template', ''));
  }

  getTemplate(templateFilePath: string): void {
    templateFilePath = templateFilePath.replace(/^~/, this.homeDir);
    this.template = fs.existsSync(templateFilePath)
      ? fs.readFileSync(templateFilePath, 'utf8').toString()
      : '';
  }

  getBuildCommand(source: string): string {
    return this.build.replace('%S', source);
  }
}
