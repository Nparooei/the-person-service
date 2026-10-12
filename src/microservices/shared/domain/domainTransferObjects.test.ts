import {
  PersonCreateInputSchema,
  EnvVariableSchema,
} from "./domainTransferObjects";
import { personInput } from "../testing/person";

describe("Person request contracts", () => {
  it("accepts a complete person", () =>
    expect(PersonCreateInputSchema.parse(personInput)).toEqual(personInput));
  it.each(["firstName", "lastName", "phoneNumber", "address"])(
    "requires %s",
    (field) => {
      expect(
        PersonCreateInputSchema.safeParse({
          ...personInput,
          [field]: undefined,
        }).success,
      ).toBe(false);
    },
  );
  it("rejects caller supplied identifiers and unknown fields", () =>
    expect(
      PersonCreateInputSchema.safeParse({ ...personInput, id: "caller-id" })
        .success,
    ).toBe(false));
  it.each([undefined, ""])(
    "rejects missing environment configuration %p",
    (value) => expect(EnvVariableSchema.safeParse(value).success).toBe(false),
  );
});
