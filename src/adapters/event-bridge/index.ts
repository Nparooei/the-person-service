import {
  EventBridgeClient,
  PutEventsCommand,
  PutEventsCommandOutput,
} from "@aws-sdk/client-eventbridge";

interface IEventBridgeClient {
  sendEvent(
    source: string,
    detailType: string,
    detail: Record<string, unknown>,
  ): Promise<PutEventsCommandOutput>;
}

export class EventBridgePublicationError extends Error {
  readonly errorCodes: string[];
  constructor(codes: (string | undefined)[]) {
    super("EventBridge rejected an event entry");
    this.name = "EventBridgePublicationError";
    this.errorCodes = [
      ...new Set(
        (codes.length ? codes : [undefined]).map((code) =>
          code && /^[A-Za-z][A-Za-z0-9]{0,63}$/.test(code)
            ? code
            : "UnknownEntryFailure",
        ),
      ),
    ];
  }
}

const createEventBridgeClient = (eventBusName: string): IEventBridgeClient => {
  const client = new EventBridgeClient();
  const sendEvent = async (
    source: string,
    detailType: string,
    detail: Record<string, unknown>,
  ): Promise<PutEventsCommandOutput> => {
    const command = new PutEventsCommand({
      Entries: [
        {
          Source: source,
          DetailType: detailType,
          Detail: JSON.stringify(detail),
          EventBusName: eventBusName,
        },
      ],
    });
    const response = await client.send(command);
    if (
      (response.FailedEntryCount ?? 0) > 0 ||
      response.Entries?.some((entry) => entry.ErrorCode)
    ) {
      throw new EventBridgePublicationError(
        response.Entries?.filter((entry) => entry.ErrorCode).map(
          (entry) => entry.ErrorCode,
        ) ?? [undefined],
      );
    }
    return response;
  };

  return {
    sendEvent,
  };
};

export { createEventBridgeClient, IEventBridgeClient };
