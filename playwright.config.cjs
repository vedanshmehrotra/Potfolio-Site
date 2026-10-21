const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  timeout: 30000,
  expect: { timeout: 7000 },
  workers: 1,
  fullyParallel: false,
  reporter: [['list'], ['json', {outputFile:'qa/test-results.json'}]],
  outputDir: 'test-results',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    channel: 'chrome',
    viewport: { width:1440, height:900 },
    video: 'on',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure'
  },
  webServer: {
    command: 'python -m http.server 4173 --bind 127.0.0.1',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: true,
    timeout: 20000
  }
});
