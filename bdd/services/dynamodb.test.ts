import { DynamoDBClient, DeleteItemCommand } from "@aws-sdk/client-dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";
import { createDynamoClient, IDynamoClient } from "../../src/adapters/dynamodb";
import { clearTable } from "./dynamodb";

jest.mock("@aws-sdk/client-dynamodb", () => ({
  ...jest.requireActual("@aws-sdk/client-dynamodb"),
  DynamoDBClient: jest.fn(() => ({ send: jest.fn() })),
}));
jest.mock("../../src/adapters/dynamodb", () => ({
  createDynamoClient: jest.fn(() => ({ scanItems: jest.fn() })),
}));

describe("BDD table cleanup", () => {
  const db = (createDynamoClient as jest.Mock).mock.results[0]
    .value as jest.Mocked<IDynamoClient>;
  const send = (DynamoDBClient as unknown as jest.Mock).mock.results[0].value
    .send as jest.Mock;

  beforeEach(() => {
    db.scanItems.mockReset();
    send.mockReset();
  });

  it("follows every page before deleting all test records", async () => {
    const key = marshall({ id: "5" });
    db.scanItems
      .mockResolvedValueOnce({
        items: Array.from({ length: 5 }, (_, index) => ({
          id: String(index + 1),
        })),
        lastEvaluatedKey: key,
      })
      .mockResolvedValueOnce({ items: [{ id: "6" }] });
    await clearTable("person-bdd-dev_person_table");
    expect(db.scanItems).toHaveBeenNthCalledWith(
      1,
      "person-bdd-dev_person_table",
      { startKey: undefined },
    );
    expect(db.scanItems).toHaveBeenNthCalledWith(
      2,
      "person-bdd-dev_person_table",
      { startKey: key },
    );
    expect(send).toHaveBeenCalledTimes(6);
    for (let index = 0; index < 6; index++) {
      expect(send.mock.calls[index][0]).toBeInstanceOf(DeleteItemCommand);
      expect(send.mock.calls[index][0].input.Key).toEqual(
        marshall({ id: String(index + 1) }),
      );
    }
  });

  it("refuses to scan or delete application tables", async () => {
    await expect(clearTable("person-prod_person_table")).rejects.toThrow(
      "Refusing",
    );
    expect(db.scanItems).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });
  it("never deletes the BDD run lock during scenario cleanup", async () => {
    db.scanItems.mockResolvedValueOnce({
      items: [{ id: "bdd-test-run-lock" }, { id: "person-1" }],
    });
    await clearTable("person-bdd-dev_events_table");
    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0][0].input.Key).toEqual(
      marshall({ id: "person-1" }),
    );
  });
});
