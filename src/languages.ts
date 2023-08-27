interface Language {
  extension: string;
  build: string;
  command: string;
  atcoderSubmitIDs: string[];
}

const cPlusPlusGcc: Language = {
  extension: 'cpp',
  build: 'g++ -o %TMP/main %OPTIONS %S',
  command: '%TMP/main',
  atcoderSubmitIDs: ['5001', '4003'],
};

const go: Language = {
  extension: 'go',
  build: 'go build -o %TMP/main %OPTIONS %S',
  command: '%TMP/main',
  atcoderSubmitIDs: ['5002', '4026'],
};

export const getLanguage = (name: string): Language => {
  if (name === 'Go') {
    return go;
  }
  return cPlusPlusGcc;
};
