import { bestEffortLogger, Logger } from "../../../shared/logging/logger";

export function logInvalidWelcomeEvent(logger: Logger): void {
  bestEffortLogger(logger).error("Invalid welcome event", {
    service: "welcome-service",
  });
}
