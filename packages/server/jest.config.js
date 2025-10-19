module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.test.ts',
    '!src/**/*.spec.ts',
  ],
  moduleNameMapper: {
    '^@scotland-yard-online/domain$': '<rootDir>/../domain/src/index.ts',
  },
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
  transformIgnorePatterns: [
    'node_modules/(?!@scotland-yard-online)',
  ],
  globals: {
    'ts-jest': {
      tsconfig: {
        resolveJsonModule: true,
        esModuleInterop: true,
      },
    },
  },
};
