import {
  DynamoDBClient,
  PutItemCommand,
  DeleteItemCommand,
} from "@aws-sdk/client-dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";
import { createRunLock, BDD_RUN_LOCK_ID } from "./run-lock";

jest.mock("@aws-sdk/client-dynamodb", () => ({
  ...jest.requireActual("@aws-sdk/client-dynamodb"),
  DynamoDBClient: jest.fn(),
}));

describe("BDD stage exclusivity", () => {
  const records = new Map<string, Record<string, { S: string }>>();
  const send = jest.fn(async (command: PutItemCommand | DeleteItemCommand) => {
    const input = command.input;
    const key = input.TableName!;
    if (command instanceof PutItemCommand) {
      if (records.has(key))
        throw Object.assign(new Error("Taken"), {
          name: "ConditionalCheckFailedException",
        });
      records.set(key, command.input.Item as Record<string, { S: string }>);
    } else {
      if (
        records.get(key)?.owner.S !==
        command.input.ExpressionAttributeValues?.[":owner"].S
      ) {
        throw Object.assign(new Error("Wrong owner"), {
          name: "ConditionalCheckFailedException",
        });
      }
      records.delete(key);
    }
    return {};
  });
  beforeEach(() => {
    records.clear();
    send.mockClear();
    (DynamoDBClient as jest.Mock).mockImplementation(() => ({ send }));
  });
  it("blocks another run on the same stage without letting it release the owner lock", async () => {
    const first = createRunLock("person-bdd-dev_events_table");
    const second = createRunLock("person-bdd-dev_events_table");
    await first.acquire();
    expect(send.mock.calls[0][0].input).toMatchObject({
      ConditionExpression: "attribute_not_exists(id)",
      Item: { id: { S: BDD_RUN_LOCK_ID } },
    });
    await expect(second.acquire()).rejects.toThrow("Another BDD run");
    await second.release();
    expect(records.size).toBe(1);
    await first.release();
    expect(records.size).toBe(0);
    await second.acquire();
    await second.release();
  });
  it("allows different stages to run independently", async () => {
    const first = createRunLock("person-bdd-first_events_table");
    const second = createRunLock("person-bdd-second_events_table");
    await first.acquire();
    await second.acquire();
    expect(records.size).toBe(2);
    await first.release();
    await second.release();
  });
  it("will not release a lock that belongs to a different owner", async () => {
    const lock = createRunLock("person-bdd-dev_events_table");
    await lock.acquire();
    records.set(
      "person-bdd-dev_events_table",
      marshall({ owner: "replacement" }) as Record<string, { S: string }>,
    );
    await expect(lock.release()).rejects.toThrow("Wrong owner");
    expect(records.size).toBe(1);
  });
  it("rejects application table names", () => {
    expect(() => createRunLock("person-prod_events_table")).toThrow("non-BDD");
    expect(send).not.toHaveBeenCalled();
  });
});
