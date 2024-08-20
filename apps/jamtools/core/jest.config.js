/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'jsdom',
    moduleNameMapper: {
      "\\.(css)$": "identity-obj-proxy",
      "~/(.*)": "<rootDir>/$1"
    }
  };