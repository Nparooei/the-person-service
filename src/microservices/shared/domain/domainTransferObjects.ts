import { z } from "zod";
import { AddressSchema, NameSchema, PhoneNumberSchema } from "./valueObjects";

export const PersonCreateInputSchema = z.strictObject({
  firstName: NameSchema,
  lastName: NameSchema,
  phoneNumber: PhoneNumberSchema,
  address: AddressSchema,
});
export type PersonCreateInput = z.infer<typeof PersonCreateInputSchema>;
export const EnvVariableSchema = z.string().min(1);
