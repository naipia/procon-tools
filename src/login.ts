import * as fs from 'fs';

export function saveLoginInfo(
  contestName: string,
  homeDir: string,
  username: string,
  password: string
): void {
  const loginInfoPath: string = homeDir + '/.procon-tools';
  const loginInfo: { [key: string]: LoginInfo } = fs.existsSync(loginInfoPath)
    ? JSON.parse(fs.readFileSync(loginInfoPath, 'utf8').toString())
    : {};
  loginInfo[contestName] = { username: username, password: password };
  fs.writeFileSync(loginInfoPath, JSON.stringify(loginInfo, null));
}

export function getLoginInfo(contestName: string, homeDir: string): LoginInfo {
  const loginInfoPath: string = homeDir + '/.procon-tools';
  const loginInfo: { [key: string]: LoginInfo } = fs.existsSync(loginInfoPath)
    ? JSON.parse(fs.readFileSync(loginInfoPath, 'utf8').toString())
    : {};
  return loginInfo[contestName];
}
