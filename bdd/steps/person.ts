import { Given, When, Then } from "@cucumber/cucumber";
import assert = require("node:assert/strict");
import { z } from "zod";
import { PersonWorld } from "../support/world";
import { requestPersonApi } from "../services/api";
import {
  readRecordFromDynamoDB,
  readDataFromDynamoDB,
} from "../services/dynamodb";
import { eventually } from "../support/utils";
import { PersonSchema } from "../../src/microservices/shared/domain/entities";
import { PersonCreatedEventSchema } from "../../src/microservices/shared/domain/events";

const CreatedResponse = z.object({ data: PersonSchema });
const ListResponse = z.object({
  data: z.object({
    persons: PersonSchema.array(),
    nextToken: z.string().nullable(),
  }),
});

Given("the Person Service is running", function (this: PersonWorld) {
  assert(this.apiUrl);
});
Given("a valid person", function (this: PersonWorld) {
  this.payload = {
    firstName: "Ada",
    lastName: "Lovelace",
    phoneNumber: "+31612345678",
    address: {
      street: "Example Street",
      houseNumber: "10A",
      postalCode: "1011AB",
      city: "Amsterdam",
      country: "Netherlands",
    },
  };
});
Given(
  "another valid person with different personal information",
  function (this: PersonWorld) {
    this.payload = {
      firstName: "Grace",
      lastName: "Hopper",
      phoneNumber: "+31687654321",
      address: {
        street: "Sample Avenue",
        houseNumber: "24B",
        postalCode: "3011CD",
        city: "Rotterdam",
        country: "Netherlands",
      },
    };
  },
);
When("I create the person", async function (this: PersonWorld) {
  this.response = await requestPersonApi(
    this.apiUrl,
    "POST",
    JSON.stringify(this.payload),
  );
  if (this.response.status === 201)
    this.persons.push(CreatedResponse.parse(this.response.body).data);
});
Then(
  "the API responds with status {int}",
  function (this: PersonWorld, status: number) {
    assert.equal(
      this.response.status,
      status,
      JSON.stringify(this.response.body),
    );
  },
);
Then(
  "the complete person is stored in the database",
  async function (this: PersonWorld) {
    const person = this.persons[this.persons.length - 1];
    assert(person);
    const stored = await readRecordFromDynamoDB(this.personTable, {
      id: person.id,
    });
    assert.deepEqual(PersonSchema.parse(stored), person);
    const { id, dateCreated, ...fields } = person;
    assert(id && dateCreated);
    assert.deepEqual(fields, this.payload);
  },
);
Then(
  "a person-created-event reaches EventBridge with the stored person",
  async function (this: PersonWorld) {
    const person = this.persons[this.persons.length - 1];
    const storedEvent = await eventually(() =>
      readRecordFromDynamoDB(this.eventsTable, { id: person.id }),
    );
    const event = PersonCreatedEventSchema.parse(storedEvent);
    assert.deepEqual(event.detail.person, person);
    assert.equal(event.detail.eventId, person.id);
    assert.equal(event.detail.timestamp, person.dateCreated);
  },
);
Then("the persons have different identifiers", function (this: PersonWorld) {
  assert.equal(this.persons.length, 2);
  assert.notEqual(this.persons[0].id, this.persons[1].id);
});
When("I list persons", async function (this: PersonWorld) {
  this.response = await requestPersonApi(this.apiUrl, "GET");
});
Then("the person list is empty", function (this: PersonWorld) {
  assert.deepEqual(ListResponse.parse(this.response.body).data, {
    persons: [],
    nextToken: null,
  });
});
Then("the list contains both persons", function (this: PersonWorld) {
  const listed = ListResponse.parse(this.response.body).data.persons;
  assert.deepEqual(
    new Map(listed.map((person) => [person.id, person])),
    new Map(this.persons.map((person) => [person.id, person])),
  );
  assert.equal(listed.length, 2);
});
When(
  "I create a person with invalid {string}",
  async function (this: PersonWorld, field: string) {
    const payload = { ...this.payload, [field]: field === "address" ? {} : "" };
    this.response = await requestPersonApi(
      this.apiUrl,
      "POST",
      JSON.stringify(payload),
    );
  },
);
When("I send malformed JSON", async function (this: PersonWorld) {
  this.response = await requestPersonApi(this.apiUrl, "POST", "{invalid");
});
Then("no person is stored", async function (this: PersonWorld) {
  assert.deepEqual(await readDataFromDynamoDB(this.personTable), []);
});

Given("six persons exist", async function (this: PersonWorld) {
  for (let index = 0; index < 6; index++) {
    const response = await requestPersonApi(
      this.apiUrl,
      "POST",
      JSON.stringify(this.payload),
    );
    assert.equal(response.status, 201);
    this.persons.push(CreatedResponse.parse(response.body).data);
  }
});
Then(
  "the first page contains five persons and a continuation token",
  function (this: PersonWorld) {
    const data = ListResponse.parse(this.response.body).data;
    assert.equal(data.persons.length, 5);
    assert(data.nextToken);
  },
);
When("I follow all remaining person pages", async function (this: PersonWorld) {
  let data = ListResponse.parse(this.response.body).data;
  const listed = [...data.persons];
  const seenTokens = new Set<string>();
  while (data.nextToken !== null) {
    assert(!seenTokens.has(data.nextToken), "Pagination token repeated");
    seenTokens.add(data.nextToken);
    const response = await requestPersonApi(this.apiUrl, "GET", undefined, {
      nextToken: data.nextToken,
    });
    assert.equal(response.status, 200);
    data = ListResponse.parse(response.body).data;
    assert(data.persons.length <= 5);
    listed.push(...data.persons);
  }
  assert.equal(listed.length, 6);
  assert.deepEqual(
    new Set(listed.map((item) => item.id)),
    new Set(this.persons.map((item) => item.id)),
  );
});
When(
  "I request a person page with limit {string}",
  async function (this: PersonWorld, limit: string) {
    this.response = await requestPersonApi(this.apiUrl, "GET", undefined, {
      limit,
    });
  },
);
