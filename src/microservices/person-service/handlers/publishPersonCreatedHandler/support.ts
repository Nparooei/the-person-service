import { DynamoDBRecord } from "aws-lambda";
import { unmarshall } from "@aws-sdk/util-dynamodb";
import { MarshalledItem } from "../../../../adapters/dynamodb/types";
import { PersonSchema } from "../../../shared/domain/entities";
import {
  PersonCreatedEventDetail,
  eventType,
} from "../../../shared/domain/events";

export function createPersonCreatedEvent(
  record: DynamoDBRecord,
): PersonCreatedEventDetail {
  if (!record.dynamodb?.NewImage)
    throw new Error("Missing person stream image");
  const person = PersonSchema.parse(
    unmarshall(record.dynamodb.NewImage as MarshalledItem),
  );
  // Stable across retries so consumers can deduplicate at-least-once delivery.
  return {
    eventId: person.id,
    eventType: eventType.PersonCreated,
    version: 1,
    timestamp: person.dateCreated,
    person,
  };
}
