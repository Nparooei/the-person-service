import { makeHandler } from "./handler";
import {
  person,
  mockDynamoClient,
  mockLogger,
} from "../../../src/microservices/shared/testing/person";
import { eventType } from "../../../src/microservices/shared/domain/events";

const event = {
  source: "person-service",
  "detail-type": "person-created-event",
  detail: {
    eventId: person.id,
    eventType: eventType.PersonCreated,
    version: 1,
    timestamp: person.dateCreated,
    person,
  },
};
describe("BDD EventBridge collector", () => {
  const db = mockDynamoClient();
  const handler = makeHandler({
    bddEventsTable: "events",
    dynamoDbClient: db,
    logger: mockLogger(),
  });
  beforeEach(() => jest.clearAllMocks());
  it("stores the actual EventBridge envelope for later assertions", async () => {
    await handler(event);
    expect(db.putItem).toHaveBeenCalledWith(
      { id: person.id, ...event },
      "events",
    );
  });
  it("propagates persistence failures so Lambda can retry", async () => {
    db.putItem.mockRejectedValueOnce(new Error("Unavailable"));
    await expect(handler(event)).rejects.toThrow("Unavailable");
  });
  it("rejects unrelated events", async () => {
    await expect(handler({ ...event, source: "other" })).rejects.toThrow();
    expect(db.putItem).not.toHaveBeenCalled();
  });
});
