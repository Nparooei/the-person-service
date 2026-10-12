import { PersonSchema } from "./entities";
import { person } from "../testing/person";

describe("Person entity", () => {
  it("preserves all stored fields", () =>
    expect(PersonSchema.parse(person)).toEqual(person));
  it("requires a generated ULID", () =>
    expect(PersonSchema.safeParse({ ...person, id: "invalid" }).success).toBe(
      false,
    ));
  it("requires a creation timestamp", () =>
    expect(
      PersonSchema.safeParse({ ...person, dateCreated: undefined }).success,
    ).toBe(false));
});
