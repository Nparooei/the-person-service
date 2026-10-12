import { AddressSchema, NameSchema, PhoneNumberSchema } from "./valueObjects";
import { personInput } from "../testing/person";

describe("Person value objects", () => {
  it("trims names and accepts international addresses", () => {
    expect(NameSchema.parse(" Ada ")).toBe("Ada");
    expect(AddressSchema.parse(personInput.address)).toEqual(
      personInput.address,
    );
  });
  it.each(["", "  ", "a".repeat(101)])("rejects invalid name %p", (value) =>
    expect(NameSchema.safeParse(value).success).toBe(false),
  );
  it.each(["0612345678", "+0123456789", "+31abc", "+123", "+1234567890123456"])(
    "rejects invalid phone %s",
    (value) => expect(PhoneNumberSchema.safeParse(value).success).toBe(false),
  );
  it("accepts an international phone", () =>
    expect(PhoneNumberSchema.parse(personInput.phoneNumber)).toBe(
      personInput.phoneNumber,
    ));
  it.each(["street", "houseNumber", "postalCode", "city", "country"])(
    "requires address %s",
    (field) => {
      expect(
        AddressSchema.safeParse({ ...personInput.address, [field]: " " })
          .success,
      ).toBe(false);
    },
  );
});
