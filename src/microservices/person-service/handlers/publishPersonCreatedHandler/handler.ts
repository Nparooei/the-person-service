import { DynamoDBStreamEvent, DynamoDBBatchResponse } from "aws-lambda";
import {
  EventBridgePublicationError,
  IEventBridgeClient,
} from "../../../../adapters/event-bridge";
import { PERSON_EVENT_SOURCE } from "../../../config";
import { Logger, withLogContext } from "../../../shared/logging/logger";
import { eventType } from "../../../shared/domain/events";
import { createPersonCreatedEvent } from "./support";

interface MakeHandlerProps {
  eventBridgeClient: IEventBridgeClient;
  logger: Logger;
}
export function makeHandler({ eventBridgeClient, logger }: MakeHandlerProps) {
  return async (event: DynamoDBStreamEvent): Promise<DynamoDBBatchResponse> => {
    for (const record of event.Records) {
      if (record.eventName !== "INSERT") continue;
      const sequenceNumber = record.dynamodb?.SequenceNumber;
      const recordLogger = withLogContext(logger, {
        service: "person-service",
        operation: "publishPersonCreated",
        sequenceNumber,
      });
      if (!sequenceNumber) {
        recordLogger.error("Missing stream sequence number");
        throw new Error("Missing stream sequence number");
      }
      try {
        const detail = createPersonCreatedEvent(record);
        recordLogger.info("Person event publication started", {
          eventId: detail.eventId,
        });
        await eventBridgeClient.sendEvent(
          PERSON_EVENT_SOURCE,
          eventType.PersonCreated,
          detail,
        );
        recordLogger.info("Person created event published", {
          eventId: detail.eventId,
        });
      } catch (error) {
        recordLogger.error("Person event publication failed", {
          errorType: error instanceof Error ? error.name : "UnknownError",
          ...(error instanceof EventBridgePublicationError
            ? { errorCodes: error.errorCodes }
            : {}),
        });
        return { batchItemFailures: [{ itemIdentifier: sequenceNumber }] };
      }
    }
    return { batchItemFailures: [] };
  };
}
