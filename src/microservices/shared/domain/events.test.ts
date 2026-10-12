import {
  PersonCreatedEventDetailSchema,
  PersonCreatedEventSchema,
  eventType,
} from "./events";
import { person } from "../testing/person";
import { PERSON_EVENT_SOURCE } from "../../config";

const detail = {
  eventId: person.id,
  eventType: eventType.PersonCreated,
  version: 1,
  timestamp: person.dateCreated,
  person,
};
describe("Person event contract", () => {
  it("accepts the EventBridge envelope", () =>
    expect(
      PersonCreatedEventSchema.parse({
        source: PERSON_EVENT_SOURCE,
        "detail-type": eventType.PersonCreated,
        detail,
      }).detail,
    ).toEqual(detail));
  it("rejects another service's event", () =>
    expect(
      PersonCreatedEventSchema.safeParse({
        source: "other",
        "detail-type": eventType.PersonCreated,
        detail,
      }).success,
    ).toBe(false));
  it.each([{ version: 2 }, { eventType: "other" }, { person: {} }])(
    "rejects incompatible detail %p",
    (patch) =>
      expect(
        PersonCreatedEventDetailSchema.safeParse({ ...detail, ...patch })
          .success,
      ).toBe(false),
  );
});
