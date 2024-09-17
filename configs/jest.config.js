/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  moduleNameMapper: {
    "\\.(css)$": "identity-obj-proxy",
    "~/core/(.*)": "<rootDir>/$1",
    "^@shoelace-style/shoelace/(.*)$": "<rootDir>/test/shoelace_mock.tsx",
  },
  globals: {
    'ts-jest': {
      diagnostics: {
        exclude: ['**'],
      },
    },
  },
};
