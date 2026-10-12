import {
  EventBridgeClient,
  PutEventsCommand,
  PutEventsCommandOutput,
} from "@aws-sdk/client-eventbridge";
import {
  EventBridgePublicationError,
  IEventBridgeClient,
  createEventBridgeClient,
} from ".";

jest.mock("@aws-sdk/client-eventbridge");

describe("createEventBridgeClient", () => {
  let client: IEventBridgeClient;
  const eventBusName = "TestEventBus";
  const mockEventBridgeClient = EventBridgeClient as jest.MockedClass<
    typeof EventBridgeClient
  >;

  beforeEach(() => {
    mockEventBridgeClient.mockClear();
    client = createEventBridgeClient(eventBusName);
  });

  it("should send an event successfully", async () => {
    const source = "test.source";
    const detailType = "test.detailType";
    const detail = { key: "value" };

    const mockResponse: PutEventsCommandOutput = {
      FailedEntryCount: 0,
      Entries: [{ EventId: "testEventId" }],
      $metadata: { httpStatusCode: 200 },
    };

    (EventBridgeClient.prototype.send as jest.Mock).mockResolvedValue(
      mockResponse,
    );

    const response = await client.sendEvent(source, detailType, detail);

    expect(response).toEqual(mockResponse);
    expect(EventBridgeClient.prototype.send).toHaveBeenCalledWith(
      expect.any(PutEventsCommand),
    );
  });

  it("should handle errors when sending an event", async () => {
    const source = "test.source";
    const detailType = "test.detailType";
    const detail = { key: "value" };
    const error = new Error("Test Error");

    (EventBridgeClient.prototype.send as jest.Mock).mockRejectedValue(error);

    await expect(client.sendEvent(source, detailType, detail)).rejects.toThrow(
      "Test Error",
    );

    expect(EventBridgeClient.prototype.send).toHaveBeenCalledWith(
      expect.any(PutEventsCommand),
    );
  });
  it("rejects HTTP 200 responses containing failed entries", async () => {
    (EventBridgeClient.prototype.send as jest.Mock).mockResolvedValueOnce({
      FailedEntryCount: 1,
      Entries: [{ ErrorCode: "InternalFailure" }],
      $metadata: { httpStatusCode: 200 },
    });
    await expect(
      client.sendEvent("person-service", "person-created-event", {}),
    ).rejects.toThrow("rejected");
  });
  it("preserves entry codes without retaining AWS error messages", async () => {
    (EventBridgeClient.prototype.send as jest.Mock).mockResolvedValueOnce({
      FailedEntryCount: 1,
      Entries: [
        {
          ErrorCode: "InternalFailure",
          ErrorMessage: "private payload details",
        },
      ],
    });
    await expect(
      client.sendEvent("person-service", "person-created-event", {}),
    ).rejects.toMatchObject({
      name: "EventBridgePublicationError",
      errorCodes: ["InternalFailure"],
    });
    const error = new EventBridgePublicationError([
      "InternalFailure",
      "bad\ncode",
      undefined,
    ]);
    expect(error.errorCodes).toEqual([
      "InternalFailure",
      "UnknownEntryFailure",
    ]);
    expect(JSON.stringify(error)).not.toContain("private payload details");
  });
});
