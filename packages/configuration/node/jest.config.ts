import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest/presets/js-with-ts-esm',
  testEnvironment: '@kevin/configuration/node/jest-environment',
  moduleDirectories: ['node_modules', 'src', 'test'],
  verbose: true,
  transformIgnorePatterns: ['node_modules/(?!(p-queue|p-timeout))']
};

export default config;
