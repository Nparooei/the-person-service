import { PersonCreatedEventSchema } from "../../../shared/domain/events";
import { Logger, withLogContext } from "../../../shared/logging/logger";

import { logInvalidWelcomeEvent } from "./support";

interface MakeHandlerProps {
  logger: Logger;
}

export function makeHandler({ logger }: MakeHandlerProps) {
  return async (event: unknown): Promise<void> => {
    const parsed = PersonCreatedEventSchema.safeParse(event);
    if (!parsed.success) {
      logInvalidWelcomeEvent(logger);
      throw parsed.error;
    }
    const { detail } = parsed.data;
    const requestLogger = withLogContext(logger, {
      service: "welcome-service",
      operation: "welcomePerson",
    });
    requestLogger.info("Welcome requested", {
      personId: detail.person.id,
      eventId: detail.eventId,
    });
  };
}
