# Procon Tools

[![Visual Studio Marketplace Version](https://img.shields.io/visual-studio-marketplace/v/naipia.procon-tools)](https://marketplace.visualstudio.com/items?itemName=naipia.procon-tools) [![GitHub license](https://img.shields.io/github/license/naipia/procon-tools)](https://github.com/naipia/procon-tools)

**Procon Tools** is VSCode extension that supports you in competitive programming using online judges.

## Features

Give the following commands to the VSCode command palette:

- `Start contest` (Alt+d): Download testcases and create source files needed for the contest
  - This extension will download the testcases when you run `Start contest` command and enter the URL.
  - Source files needed for the contest are automatically generated when you run `Start contest` command.
- `Run tests` (Alt+Enter): Run all testcases
  - This extension will run the code in the source file and check the answers to all the tests when you run `Run tests` command or press <img src="img/run.png" width="15"> button.
- `Custom test`: Run Custom test
- `Submit code`: Submit code
  - This extension will submit the code based on the generated source file when you run `Submit code` command.
- `Login`: Login
  - Once you login, this extension will login automatically the next time. Login information is saved in your home directory ( `~/.procon-tools` ).

## Contest sites supported by Procon Tools

- [AtCoder](https://atcoder.jp/)

<!-- - [Codeforces](https://codeforces.com/) -->
<!-- - [yukicoder](https://yukicoder.me/) -->

## Supported languages

- `C++`
- `Go`
