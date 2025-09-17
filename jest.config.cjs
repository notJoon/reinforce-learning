/** @type {import('jest').Config} */
module.exports = {
  projects: [
    {
      displayName: 'qlearn-lite',
      testMatch: ['<rootDir>/qlearn-lite/tests/**/*.test.ts'],
      preset: 'ts-jest',
      testEnvironment: 'node',
      moduleFileExtensions: ['ts', 'js'],
      transform: {
        '^.+\\.ts$': ['ts-jest', {
          tsconfig: {
            target: 'ES2020',
            module: 'commonjs',
            esModuleInterop: true,
          },
        }],
      },
      collectCoverageFrom: [
        '<rootDir>/qlearn-lite/src/**/*.ts',
        '!<rootDir>/qlearn-lite/src/index.ts',
      ],
    },
    {
      displayName: 'rl-logger',
      testMatch: ['<rootDir>/rl-logger/tests/**/*.test.ts'],
      preset: 'ts-jest',
      testEnvironment: 'node',
      extensionsToTreatAsEsm: ['.ts'],
      moduleFileExtensions: ['ts', 'js'],
      transform: {
        '^.+\\.tsx?$': ['ts-jest', {
          useESM: true,
        }],
      },
      collectCoverageFrom: [
        '<rootDir>/rl-logger/src/**/*.ts',
        '!<rootDir>/rl-logger/src/**/index.ts',
      ],
    },
  ],
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  verbose: true,
};
