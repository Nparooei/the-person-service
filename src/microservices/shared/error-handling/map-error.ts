import { ZodError } from "zod";
import { ApiError } from "./api-error";
import { Logger } from "../logging/logger";
import { makeApiGatewayResult } from "../../../adapters/api-gatway";

export const handleError = (error: unknown, logger: Logger) => {
  if (error instanceof ApiError && error.status < 500) {
    return makeApiGatewayResult(error.message, error.status, {});
  }
  if (error instanceof ZodError) {
    return makeApiGatewayResult("Invalid request", 400, {
      issues: error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    });
  }
  // Do not expose exception messages or log personal information.
  logger.error("Person request failed", {
    errorType: error instanceof Error ? error.name : "UnknownError",
  });
  return makeApiGatewayResult("Internal server error", 500, {});
};
