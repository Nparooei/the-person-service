import { makeHandler } from "./handler";
import { eventType } from "../../../shared/domain/events";
import { PERSON_EVENT_SOURCE } from "../../../config";
import { person, mockLogger } from "../../../shared/testing/person";

const event = {
  source: PERSON_EVENT_SOURCE,
  "detail-type": eventType.PersonCreated,
  detail: {
    eventId: person.id,
    eventType: eventType.PersonCreated,
    version: 1,
    timestamp: person.dateCreated,
    person,
  },
};

describe("Welcome person", () => {
  const logger = mockLogger();
  const handler = makeHandler({ logger });

  beforeEach(() => jest.clearAllMocks());

  it("logs the welcome action using only person and event identifiers", async () => {
    await handler(event);
    expect(logger.info).toHaveBeenCalledTimes(1);
    expect(logger.info).toHaveBeenCalledWith("Welcome requested", {
      personId: person.id,
      eventId: person.id,
      service: "welcome-service",
      operation: "welcomePerson",
    });
  });

  it.each([
    null,
    {},
    { ...event, source: "other-service" },
    { ...event, "detail-type": "person-deleted-event" },
    { ...event, detail: { ...event.detail, version: 2 } },
    { ...event, detail: { ...event.detail, person: { id: person.id } } },
  ])(
    "rejects invalid or unrelated events without a welcome action: %p",
    async (input) => {
      await expect(handler(input)).rejects.toThrow();
      expect(logger.info).not.toHaveBeenCalled();
    },
  );

  it("does not fail the simulated welcome action when logging fails", async () => {
    logger.info.mockImplementationOnce(() => {
      throw new Error("Logging unavailable");
    });
    await expect(handler(event)).resolves.toBeUndefined();
  });

  it("logs malformed event failures without payloads", async () => {
    await expect(
      handler({ detail: { privateData: "secret" } }),
    ).rejects.toThrow();
    expect(logger.error).toHaveBeenCalledWith("Invalid welcome event", {
      service: "welcome-service",
    });
  });
});
