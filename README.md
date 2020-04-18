# Procon Tools

[![GitHub license](https://img.shields.io/github/license/naipia/procon-tools)](https://github.com/naipia/procon-tools)

**Procon tools** is VSCode extension that supports you in competitive programming using online judges.

## Features

Give the following commands to the VSCode command palette:

- Download testcases: `Start contest`
  - This extension will download the testcases when you run `Start contest` command and enter the URL.
- Create source files needed for the contest
  - Source files needed for the contest are automatically generated when you run `Start contest` command.
- Run tests: `Run tests`
  - This extension will run the code in the source file and check the answers to all the tests when you run `Run tests` command or press the "▷ Run tests" button.
- Submit code: `Submit code`
  - This extension will submit the code based on the generated source file when you run `Submit code` command.
- Login: `Login`
  - You need to login once with `Login` command before submitting.

## Contest sites supported by Procon Tools

- [AtCoder](https://atcoder.jp/)

### Scheduled to be supported

- [Codeforces](https://codeforces.com/)
- [yukicoder](https://yukicoder.me/)

## Supported languages

- `C++`
- `Go`

## Extension Settings

- `procon-tools.home`: Set a working directory path for contests. The default is `~/contests`.
- `procon-tools.language`: Set a language of automatically generated source files. The default is C++.
