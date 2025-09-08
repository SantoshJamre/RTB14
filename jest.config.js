module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.js'],
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov'],
  setupFilesAfterEnv: ['<rootDir>/test/setup.js'],
  testTimeout: 30000,
  globals: {
    'ts-jest': {
      isolatedModules: true
    }
  },
  transform: {
    '^.+\\.js$': 'babel-jest'
  },
  reporters: [
    "default", // keep default console output
    ["jest-html-reporter", {
      pageTitle: "Test Report",
      outputPath: "test-report/test-report.html",
      includeFailureMsg: true,
      includeConsoleLog: true,
      theme: "defaultTheme" // or "lightTheme" / "darkTheme"
    }]
  ]
};
