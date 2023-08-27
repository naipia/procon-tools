interface SourceFileObj {
  source: string;
  filename: string;
}

interface Execution {
  stdin: string;
  expect: string;
  stdout: string;
  stderr: string;
  time: string;
  status: string;
}

interface SubmitInfo {
  submitUrl: string;
  taskName: string;
}

interface LoginInfo {
  username: string;
  password: string;
}
