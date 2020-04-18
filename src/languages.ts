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
    command: 'g++ %S && ./a.out < %IN > %OUT',
    atcoderID: 'text/x-c++src',
  },
  Go: {
    extension: 'go',
    command: 'go build -o ./main %S && ./main < %IN > %OUT',
    atcoderID: 'text/x-go',
  },
};
