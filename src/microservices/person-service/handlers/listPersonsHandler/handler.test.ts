import { APIGatewayProxyEvent } from "aws-lambda";
import { marshall } from "@aws-sdk/util-dynamodb";
import { makeHandler } from "./handler";
import {
  person,
  mockDynamoClient,
  mockLogger,
} from "../../../shared/testing/person";

const event = (queryStringParameters: Record<string, string> | null = null) =>
  ({ queryStringParameters }) as APIGatewayProxyEvent;
const token = (value: unknown) =>
  Buffer.from(JSON.stringify(value)).toString("base64url");

describe("List persons", () => {
  const db = mockDynamoClient();
  const logger = mockLogger();
  const handler = makeHandler({
    personTableName: "persons",
    dynamoDbClient: db,
    logger,
  });
  beforeEach(() => {
    jest.clearAllMocks();
    db.scanItems.mockResolvedValue({ items: [] });
  });
  it("defaults to five records and returns an empty final page", async () => {
    const result = await handler(event());
    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body).data).toEqual({
      persons: [],
      nextToken: null,
    });
    expect(db.scanItems).toHaveBeenCalledWith("persons", {
      limit: 5,
      startKey: undefined,
    });
  });
  it("returns five persons and resumes from the returned token", async () => {
    const persons = Array.from({ length: 5 }, (_, index) => ({
      ...person,
      id: `01ARZ3NDEKTSV4RRFFQ69G5FA${index}`,
    }));
    const key = marshall({ id: persons[4].id });
    db.scanItems.mockResolvedValueOnce({
      items: persons,
      lastEvaluatedKey: key,
    });
    const first = await handler(event({ limit: "5" }));
    expect(first.statusCode).toBe(200);
    const data = JSON.parse(first.body).data;
    expect(data.persons).toEqual(persons);
    expect(data.nextToken).toEqual(expect.any(String));
    db.scanItems.mockResolvedValueOnce({ items: [person] });
    const last = await handler(event({ nextToken: data.nextToken }));
    expect(db.scanItems).toHaveBeenLastCalledWith("persons", {
      limit: 5,
      startKey: key,
    });
    expect(JSON.parse(last.body).data).toEqual({
      persons: [person],
      nextToken: null,
    });
  });
  it("accepts a smaller page size", async () => {
    await handler(event({ limit: "2" }));
    expect(db.scanItems).toHaveBeenCalledWith("persons", {
      limit: 2,
      startKey: undefined,
    });
  });
  it.each([
    "6",
    "100",
    "0",
    "-1",
    "1.5",
    "abc",
    "",
    "Infinity",
    "1e1",
    " 5",
    "05",
  ])("rejects invalid limit %p without reading the database", async (limit) => {
    expect((await handler(event({ limit }))).statusCode).toBe(400);
    expect(db.scanItems).not.toHaveBeenCalled();
  });
  it.each([
    "",
    "%%%",
    "a".repeat(257),
    "a",
    token("text"),
    token({}),
    token({ id: "bad" }),
    token({ id: person.id, limit: 100 }),
    token({ id: { S: person.id } }),
  ])(
    "rejects malformed token %p without reading the database",
    async (nextToken) => {
      expect((await handler(event({ nextToken }))).statusCode).toBe(400);
      expect(db.scanItems).not.toHaveBeenCalled();
    },
  );
  it.each(["limit", "nextToken"])(
    "rejects repeated %s parameters",
    async (key) => {
      const request = event();
      request.multiValueQueryStringParameters = { [key]: ["1", "2"] };
      expect((await handler(request)).statusCode).toBe(400);
      expect(db.scanItems).not.toHaveBeenCalled();
    },
  );
  it("preserves continuation for an empty intermediate page", async () => {
    db.scanItems.mockResolvedValueOnce({
      items: [],
      lastEvaluatedKey: marshall({ id: person.id }),
    });
    const result = await handler(event());
    expect(JSON.parse(result.body).data).toEqual({
      persons: [],
      nextToken: token({ id: person.id }),
    });
  });
  it("returns 500 for invalid persisted data", async () => {
    db.scanItems.mockResolvedValueOnce({ items: [{ id: "bad" }] });
    expect((await handler(event())).statusCode).toBe(500);
  });
  it("returns 500 for invalid stored continuation keys", async () => {
    db.scanItems.mockResolvedValueOnce({
      items: [],
      lastEvaluatedKey: marshall({ id: "bad" }),
    });
    expect((await handler(event())).statusCode).toBe(500);
  });
  it("returns 500 for a database outage", async () => {
    db.scanItems.mockRejectedValueOnce(new Error("Database unavailable"));
    expect((await handler(event())).statusCode).toBe(500);
  });
  it("logs the number of listed persons", async () => {
    const request = event();
    const response = await handler(request);
    expect(response.statusCode).toBe(200);
    expect(logger.info).toHaveBeenCalledWith(
      "Persons listed",
      expect.objectContaining({ count: 0 }),
    );
  });
  it("keeps list results and validation responses when logging fails", async () => {
    logger.info.mockImplementation(() => {
      throw new Error("Log sink failed");
    });
    try {
      expect((await handler(event())).statusCode).toBe(200);
      expect((await handler(event({ limit: "6" }))).statusCode).toBe(400);
    } finally {
      logger.info.mockReset();
    }
  });
});
