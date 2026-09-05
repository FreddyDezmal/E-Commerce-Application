module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/tests/setupEnv.ts'],
  testMatch: ['<rootDir>/tests/**/*.test.ts'],
};