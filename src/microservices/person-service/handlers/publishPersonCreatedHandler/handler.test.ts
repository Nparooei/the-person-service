import { EventBridgePublicationError } from "../../../../adapters/event-bridge";
import { DynamoDBRecord } from "aws-lambda";
import { marshall } from "@aws-sdk/util-dynamodb";
import { makeHandler } from "./handler";
import { person, mockLogger } from "../../../shared/testing/person";
import { PERSON_EVENT_SOURCE } from "../../../config";
import { eventType } from "../../../shared/domain/events";

const record = (sequence = "1"): DynamoDBRecord => ({
  eventName: "INSERT",
  dynamodb: {
    SequenceNumber: sequence,
    NewImage: marshall(person) as NonNullable<
      DynamoDBRecord["dynamodb"]
    >["NewImage"],
  },
});
describe("Publish person-created-event", () => {
  const client = {
    sendEvent: jest.fn().mockResolvedValue({ FailedEntryCount: 0 }),
  };
  const logger = mockLogger();
  const handler = makeHandler({
    eventBridgeClient: client,
    logger,
  });
  beforeEach(() => {
    jest.clearAllMocks();
    client.sendEvent.mockResolvedValue({ FailedEntryCount: 0 });
  });
  it("publishes the persisted person through EventBridge", async () => {
    expect(await handler({ Records: [record()] })).toEqual({
      batchItemFailures: [],
    });
    expect(client.sendEvent).toHaveBeenCalledWith(
      PERSON_EVENT_SOURCE,
      "person-created-event",
      {
        eventId: person.id,
        eventType: eventType.PersonCreated,
        version: 1,
        timestamp: person.dateCreated,
        person,
      },
    );
  });
  it("keeps event IDs and timestamps stable on retry", async () => {
    await handler({ Records: [record()] });
    await handler({ Records: [record()] });
    expect(client.sendEvent.mock.calls[0]).toEqual(
      client.sendEvent.mock.calls[1],
    );
  });
  it("reports a failed sequence and stops before later records", async () => {
    client.sendEvent.mockRejectedValueOnce(new Error("Unavailable"));
    expect(await handler({ Records: [record("42"), record("43")] })).toEqual({
      batchItemFailures: [{ itemIdentifier: "42" }],
    });
    expect(client.sendEvent).toHaveBeenCalledTimes(1);
  });
  it("does not publish malformed stored persons", async () => {
    const bad = record();
    bad.dynamodb!.NewImage = { id: { S: person.id } };
    expect(await handler({ Records: [bad] })).toEqual({
      batchItemFailures: [{ itemIdentifier: "1" }],
    });
    expect(client.sendEvent).not.toHaveBeenCalled();
  });
  it("ignores updates and removals", async () => {
    expect(
      await handler({
        Records: [
          { ...record(), eventName: "MODIFY" },
          { ...record(), eventName: "REMOVE" },
        ],
      }),
    ).toEqual({ batchItemFailures: [] });
    expect(client.sendEvent).not.toHaveBeenCalled();
  });
  it("throws rather than silently acknowledging records without sequence numbers", async () => {
    await expect(
      handler({ Records: [{ eventName: "INSERT" }] }),
    ).rejects.toThrow("sequence number");
  });

  it("logs sanitized entry codes for publication failures", async () => {
    client.sendEvent.mockRejectedValueOnce(
      new EventBridgePublicationError(["InternalFailure"]),
    );
    await handler({ Records: [record()] });
    expect(logger.error).toHaveBeenCalledWith(
      "Person event publication failed",
      expect.objectContaining({
        errorType: "EventBridgePublicationError",
        errorCodes: ["InternalFailure"],
      }),
    );
  });
  it("does not retry a published record just because logging failed", async () => {
    logger.info.mockImplementation(() => {
      throw new Error("Log sink failed");
    });
    try {
      expect(await handler({ Records: [record()] })).toEqual({
        batchItemFailures: [],
      });
      expect(client.sendEvent).toHaveBeenCalledTimes(1);
    } finally {
      logger.info.mockReset();
    }
  });
});
