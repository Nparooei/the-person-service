import { z } from "zod";
import { PersonSchema } from "./entities";
import { PERSON_EVENT_SOURCE } from "../../config";

export const eventType = { PersonCreated: "person-created-event" } as const;
export const PersonCreatedEventDetailSchema = z.strictObject({
  eventId: z.ulid(),
  eventType: z.literal(eventType.PersonCreated),
  version: z.literal(1),
  timestamp: z.iso.datetime(),
  person: PersonSchema,
});
export type PersonCreatedEventDetail = z.infer<
  typeof PersonCreatedEventDetailSchema
>;
export const PersonCreatedEventSchema = z.object({
  source: z.literal(PERSON_EVENT_SOURCE),
  "detail-type": z.literal(eventType.PersonCreated),
  detail: PersonCreatedEventDetailSchema,
});
