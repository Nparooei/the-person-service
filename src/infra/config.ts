import { LogLevel } from "../microservices/shared/logging/logger";

interface ApplicationConfig {
  region: string;
  suffix: string;
  logLevel: LogLevel;
}
function applicationConfig(): ApplicationConfig {
  return {
    region: process.env.AWS_REGION ?? "us-east-1",
    suffix: "person",
    logLevel: "info",
  };
}

export { applicationConfig };
