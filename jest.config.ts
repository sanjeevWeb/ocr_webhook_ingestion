// import type { Config } from 'jest';

// const config: Config = {
//   preset: 'ts-jest/presets/default-esm', // ESM + TypeScript
//   testEnvironment: 'node',
//   extensionsToTreatAsEsm: ['.ts'],
//   globals: {
//     'ts-jest': {
//       useESM: true,
//     },
//   },
//   transform: {},
//   moduleFileExtensions: ['ts', 'js', 'json'],
//   testMatch: ['src/__tests__/*.test.ts'],
//   verbose: true,
// };

// export default config;

import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  globals: {
    'ts-jest': {
      useESM: true,
    },
  },
  transform: {},
  moduleFileExtensions: ['ts', 'js', 'json'],
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/?(*.)+(spec|test).ts'
  ],
  verbose: true,
};

export default config;

