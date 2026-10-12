import { z } from "zod";
import { PersonCreateInputSchema } from "./domainTransferObjects";

export const PersonSchema = PersonCreateInputSchema.extend({
  id: z.ulid(),
  dateCreated: z.iso.datetime(),
});
export type Person = z.infer<typeof PersonSchema>;
