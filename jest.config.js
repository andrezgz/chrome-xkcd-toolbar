module.exports = {
  testEnvironment: "jsdom",
  testMatch: ["**/test/**/*.test.js"],
  setupFilesAfterEnv: ["<rootDir>/test/setupJest.js"]
};
