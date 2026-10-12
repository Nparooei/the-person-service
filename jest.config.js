module.exports = {
  testEnvironment: "node",
  roots: ["<rootDir>/src", "<rootDir>/bdd", "<rootDir>/bin"],
  testMatch: ["**/*.test.ts"],
  transform: { "^.+\\.tsx?$": "ts-jest" },
};
