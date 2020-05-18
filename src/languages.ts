interface Language {
  extension: string;
  command: string;
  atdocerID: string;
}

const cPlusPlus: Language = {
  extension: 'cpp',
  command: 'g++ -o %TMP/main %S && %TMP/main < %IN > %OUT',
  atdocerID: 'text/x-c++src',
};

const go: Language = {
  extension: 'go',
  command: 'go build -o %TMP/main %S && %TMP/main < %IN > %OUT',
  atdocerID: 'text/x-go',
};

export const getLanguage = (name: string): Language => {
  if (name === 'C++') {
    return cPlusPlus;
  }
  return go;
};
