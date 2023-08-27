import * as vscode from 'vscode';
import * as path from 'path';

import { Configuration } from '../configuration';
import { getActiveFilePath } from '../util';
import * as atcoder from '../contest/atcoder';

/**
 * Procon: Submit code
 */
export async function submit(conf: Configuration): Promise<void> {
  const activeFilePath: string | undefined = getActiveFilePath(conf);
  if (!activeFilePath) {
    return;
  }

  if (conf.confirmation) {
    const submit: string | undefined = await vscode.window.showQuickPick(
      ['Yes', 'No'],
      {
        placeHolder: 'Submit ' + path.basename(activeFilePath),
      }
    );
    if (!submit || submit === 'No') {
      return;
    }
  }

  const contest: string = activeFilePath.replace(conf.proconRoot, '');
  if (contest.match(/atcoder/)) {
    atcoder.submit(conf, activeFilePath);
  }
}
