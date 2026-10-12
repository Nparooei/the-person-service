import { IDynamoClient } from "../../../src/adapters/dynamodb";
import {
  bestEffortLogger,
  Logger,
} from "../../../src/microservices/shared/logging/logger";
import { PersonCreatedEventSchema } from "../../../src/microservices/shared/domain/events";

interface MakeHandlerProps {
  bddEventsTable: string;
  dynamoDbClient: IDynamoClient;
  logger: Logger;
}
export function makeHandler({
  bddEventsTable,
  dynamoDbClient,
  logger,
}: MakeHandlerProps) {
  const safeLogger = bestEffortLogger(logger);
  return async (event: unknown): Promise<void> => {
    const parsed = PersonCreatedEventSchema.parse(event);
    await dynamoDbClient.putItem(
      { id: parsed.detail.person.id, ...parsed },
      bddEventsTable,
    );
    safeLogger.info("Person event captured", {
      personId: parsed.detail.person.id,
    });
  };
}
