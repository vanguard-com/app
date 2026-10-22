/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  moduleNameMapper: { '\\.tflite$': '<rootDir>/scripts/jest-model-asset.cjs' },
  setupFiles: ['<rootDir>/jest.setup.tsx'],
  testPathIgnorePatterns: ['/node_modules/', '/android/', '/ios/'],
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/**/*.d.ts'],
};
