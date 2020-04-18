interface LangInfo {
  [key: string]: {
    extension: string;
    command: string;
    atcoderID: string;
  };
}

export const languages: LangInfo = {
  'C++': {
    extension: 'cpp',
    command: 'g++ -o /tmp/main %S && /tmp/main < %IN > %OUT',
    atcoderID: 'text/x-c++src',
  },
  Go: {
    extension: 'go',
    command: 'go build -o /tmp/main %S && /tmp/main < %IN > %OUT',
    atcoderID: 'text/x-go',
  },
};
