import {
  DynamoDBClient,
  PutItemCommand,
  ScanCommand,
  DeleteItemCommand,
} from "@aws-sdk/client-dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";
import { createDynamoClient } from ".";

jest.mock("@aws-sdk/client-dynamodb", () => ({
  ...jest.requireActual("@aws-sdk/client-dynamodb"),
  DynamoDBClient: jest.fn(),
}));
describe("DynamoDB adapter", () => {
  const send = jest.fn();
  beforeEach(() => {
    jest.clearAllMocks();
    (DynamoDBClient as jest.Mock).mockImplementation(() => ({ send }));
  });
  it("marshals a nested person address", async () => {
    const item = { id: "123", address: { city: "Amsterdam" } };
    await createDynamoClient().putItem(item, "persons");
    expect(send.mock.calls[0][0]).toBeInstanceOf(PutItemCommand);
    expect(send.mock.calls[0][0].input).toEqual({
      TableName: "persons",
      Item: marshall(item),
    });
  });
  it("reads only one bounded page and returns its continuation key", async () => {
    const key = marshall({ id: "1" });
    send.mockResolvedValueOnce({
      Items: [marshall({ id: "1" })],
      LastEvaluatedKey: key,
    });
    expect(await createDynamoClient().scanItems("persons")).toEqual({
      items: [{ id: "1" }],
      lastEvaluatedKey: key,
    });
    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0][0]).toBeInstanceOf(ScanCommand);
    expect(send.mock.calls[0][0].input).toEqual({
      TableName: "persons",
      ConsistentRead: true,
      Limit: 5,
      ExclusiveStartKey: undefined,
    });
  });
  it("resumes from the supplied key with a smaller limit", async () => {
    const key = marshall({ id: "1" });
    send.mockResolvedValueOnce({ Items: [marshall({ id: "2" })] });
    expect(
      await createDynamoClient().scanItems("persons", {
        limit: 2,
        startKey: key,
      }),
    ).toEqual({
      items: [{ id: "2" }],
      lastEvaluatedKey: undefined,
    });
    expect(send.mock.calls[0][0].input).toEqual({
      TableName: "persons",
      ConsistentRead: true,
      Limit: 2,
      ExclusiveStartKey: key,
    });
  });
  it.each([0, -1, 6, 100, 1.5, NaN, Infinity])(
    "rejects invalid adapter limit %p before calling AWS",
    async (limit) => {
      await expect(
        createDynamoClient().scanItems("persons", { limit }),
      ).rejects.toThrow(RangeError);
      expect(send).not.toHaveBeenCalled();
    },
  );
  it.each([{ Items: [], LastEvaluatedKey: {} }, {}])(
    "handles empty pages without a continuation key",
    async (response) => {
      send.mockResolvedValueOnce(response);
      expect(await createDynamoClient().scanItems("persons")).toEqual({
        items: [],
        lastEvaluatedKey: undefined,
      });
      expect(send).toHaveBeenCalledTimes(1);
    },
  );
  it("propagates scan failures", async () => {
    send.mockRejectedValueOnce(new Error("Database unavailable"));
    await expect(createDynamoClient().scanItems("persons")).rejects.toThrow(
      "Database unavailable",
    );
  });
  it("deletes by the supplied key", async () => {
    await createDynamoClient().deleteItem({ id: "1" }, "persons");
    expect(send.mock.calls[0][0]).toBeInstanceOf(DeleteItemCommand);
    expect(send.mock.calls[0][0].input.Key).toEqual(marshall({ id: "1" }));
  });
});
