interface Language {
  extension: string;
  build: string;
  command: string;
  atdocerID: string;
}

const cPlusPlus: Language = {
  extension: 'cpp',
  build: 'g++ -o %TMP/main %OPTIONS %S',
  command: '%TMP/main',
  atdocerID: 'text/x-c++src',
};

const go: Language = {
  extension: 'go',
  build: 'go build -o %TMP/main %OPTIONS %S',
  command: '%TMP/main',
  atdocerID: 'text/x-go',
};

export const getLanguage = (name: string): Language => {
  if (name === 'C++') {
    return cPlusPlus;
  }
  return go;
};
