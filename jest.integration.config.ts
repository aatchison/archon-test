import type { Config } from "jest";

const config: Config = {
  testEnvironment: "node",
  testMatch: ["**/*.integration.test.ts"],
  moduleNameMapper: { "^@/(.*)$": "<rootDir>/$1" },
  transform: { "^.+\\.tsx?$": ["ts-jest", { tsconfig: "tsconfig.json" }] },
};

export default config;
