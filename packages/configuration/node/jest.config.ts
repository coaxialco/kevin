import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest/presets/js-with-ts-esm',
  testEnvironment: '@kevin/configuration/node/jest-environment',
  moduleDirectories: ['node_modules', 'src', 'test'],
  verbose: true,
  extensionsToTreatAsEsm: ['.ts'],
  transformIgnorePatterns: ['node_modules/(?!(p-queue|p-timeout|import-meta-resolve))'],
  transform: {
    '^.+\\.(ts|tsx)?$': 'ts-jest',
    '^.+\\.(js|jsx)$': 'babel-jest'
  }
};

export default config;
