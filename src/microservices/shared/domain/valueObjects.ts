import { z } from "zod";

export const NameSchema = z.string().trim().min(1).max(100);
export const PhoneNumberSchema = z
  .string()
  .regex(
    /^\+[1-9]\d{7,14}$/,
    "Use international format, for example +31612345678",
  );
export const AddressSchema = z.strictObject({
  street: z.string().trim().min(1).max(200),
  houseNumber: z.string().trim().min(1).max(20),
  postalCode: z.string().trim().min(1).max(20),
  city: z.string().trim().min(1).max(100),
  country: z.string().trim().min(1).max(100),
});
export type Address = z.infer<typeof AddressSchema>;
